// IP限制相关工具
// 存储IP请求记录的Map
// 格式: { ip => [{ timestamp, count }] }
const ipRequestsMap = new Map();

// 从环境变量获取限制配置
// 格式: "rate/minutes", 例如 "5/10" 表示每10分钟5次
// 默认值: "20/10" 表示每10分钟20次
// 如果值为 "0/0" 则表示无限制
function getRateLimitConfig() {
  const configStr = process.env.RATE_LIMIT || "20/10";
  const [rateStr, minutesStr] = configStr.split('/');
  
  const rate = parseInt(rateStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  // 检查配置是否有效，如果无效则使用默认值
  if (isNaN(rate) || isNaN(minutes)) {
    console.warn(`[速率限制] 无效的限制配置: ${configStr}，使用默认值 20/10`);
    return {
      enabled: true,
      rate: 20,
      minutes: 10,
      windowMs: 10 * 60 * 1000
    };
  }

  // 检查是否为0/0（无限制）
  if (rate === 0 && minutes === 0) {
    console.log('[速率限制] 已禁用速率限制');
    return {
      enabled: false,
      rate: 0,
      minutes: 0,
      windowMs: 0
    };
  }
  
  console.log(`[速率限制] 配置: 每${minutes}分钟${rate}次请求`);
  return {
    enabled: true,
    rate,
    minutes,
    windowMs: minutes * 60 * 1000
  };
}

// 限制配置
const RATE_LIMIT = getRateLimitConfig();

/**
 * 获取限制配置信息
 * @returns {Object} - 配置对象
 */
export function getRateLimitInfo() {
  return {
    enabled: RATE_LIMIT.enabled,
    maxRequests: RATE_LIMIT.rate,
    windowMs: RATE_LIMIT.windowMs,
    minutes: RATE_LIMIT.minutes
  };
}

/**
 * 检查IP是否超出限制
 * @param {string} ip - 客户端IP地址
 * @returns {Object} - 返回检查结果 { limited: 是否限制, remaining: 剩余次数, resetTime: 重置时间 }
 */
export function checkRateLimit(ip) {
  // 如果禁用了速率限制，直接返回无限制状态
  if (!RATE_LIMIT.enabled) {
    return {
      limited: false,
      remaining: Infinity,
      resetTime: 0,
      resetTimeFormatted: '无限制'
    };
  }

  const now = Date.now();
  
  // 如果IP不在记录中，添加新记录
  if (!ipRequestsMap.has(ip)) {
    ipRequestsMap.set(ip, []);
  }
  
  // 获取当前IP的请求记录
  const requests = ipRequestsMap.get(ip);
  
  // 清理过期的请求记录 (超过窗口期的记录)
  const validRequests = requests.filter(
    req => now - req.timestamp < RATE_LIMIT.windowMs
  );
  
  // 更新记录
  ipRequestsMap.set(ip, validRequests);
  
  // 计算当前时间窗口内的请求总数
  const requestCount = validRequests.reduce((sum, req) => sum + req.count, 0);
  
  // 计算重置时间（如果有请求记录）
  let resetTime = now + RATE_LIMIT.windowMs;
  if (validRequests.length > 0) {
    const oldestRequest = validRequests[0];
    resetTime = oldestRequest.timestamp + RATE_LIMIT.windowMs;
  }
  
  // 检查是否超过限制
  const isLimited = requestCount >= RATE_LIMIT.rate;
  
  // 计算剩余请求数
  const remaining = Math.max(0, RATE_LIMIT.rate - requestCount);
  
  // 日志记录
  console.log(`[速率限制] IP: ${ip}, ${RATE_LIMIT.minutes}分钟内已请求: ${requestCount}/${RATE_LIMIT.rate}, 剩余: ${remaining}, 限制状态: ${isLimited}`);
  
  return {
    limited: isLimited,
    remaining,
    resetTime,
    // 格式化后的时间，方便前端显示
    resetTimeFormatted: new Date(resetTime).toLocaleTimeString()
  };
}

/**
 * 记录IP请求
 * @param {string} ip - 客户端IP地址
 */
export function recordRequest(ip) {
  // 如果禁用了速率限制，不记录请求
  if (!RATE_LIMIT.enabled) {
    return;
  }

  const now = Date.now();
  
  // 如果IP不在记录中，添加新记录
  if (!ipRequestsMap.has(ip)) {
    ipRequestsMap.set(ip, []);
  }
  
  const requests = ipRequestsMap.get(ip);
  requests.push({ timestamp: now, count: 1 });
  
  // 保持记录最新，只保留窗口期内的记录
  const validRequests = requests.filter(
    req => now - req.timestamp < RATE_LIMIT.windowMs
  );
  
  ipRequestsMap.set(ip, validRequests);
  
  console.log(`[速率限制] 记录IP: ${ip}的新请求, 当前记录数: ${validRequests.length}`);
}

/**
 * 获取IP地址统计信息（用于管理员查看）
 */
export function getIpStats() {
  // 如果禁用了速率限制，返回空数组
  if (!RATE_LIMIT.enabled) {
    return [];
  }

  const now = Date.now();
  const stats = [];
  
  ipRequestsMap.forEach((requests, ip) => {
    // 只统计窗口期内的请求
    const validRequests = requests.filter(
      req => now - req.timestamp < RATE_LIMIT.windowMs
    );
    
    if (validRequests.length > 0) {
      const count = validRequests.reduce((sum, req) => sum + req.count, 0);
      const oldestRequest = validRequests[0];
      const resetTime = oldestRequest.timestamp + RATE_LIMIT.windowMs;
      
      stats.push({
        ip,
        requestCount: count,
        remaining: Math.max(0, RATE_LIMIT.rate - count),
        limited: count >= RATE_LIMIT.rate,
        resetTime
      });
    }
  });
  
  return stats;
}

// 定期清理过期数据
setInterval(() => {
  // 如果禁用了速率限制，不清理数据
  if (!RATE_LIMIT.enabled) {
    return;
  }

  const now = Date.now();
  
  ipRequestsMap.forEach((requests, ip) => {
    const validRequests = requests.filter(
      req => now - req.timestamp < RATE_LIMIT.windowMs
    );
    
    if (validRequests.length === 0) {
      // 如果没有有效请求，则删除该IP的记录
      ipRequestsMap.delete(ip);
    } else {
      // 更新为有效请求
      ipRequestsMap.set(ip, validRequests);
    }
  });
  
  console.log(`[速率限制] 清理过期数据, 当前跟踪IP数: ${ipRequestsMap.size}`);
}, 30 * 60 * 1000); // 每30分钟清理一次 