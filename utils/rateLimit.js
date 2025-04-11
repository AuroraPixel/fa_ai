// IP限制相关工具
// 存储IP请求记录的Map
// 格式: { ip => [{ timestamp, count }] }
const ipRequestsMap = new Map();

// 限制配置
const RATE_LIMIT = {
  windowMs: 10 * 60 * 1000, // 10分钟
  maxRequests: 5 // 最大请求数
};

/**
 * 检查IP是否超出限制
 * @param {string} ip - 客户端IP地址
 * @returns {Object} - 返回检查结果 { limited: 是否限制, remaining: 剩余次数, resetTime: 重置时间 }
 */
export function checkRateLimit(ip) {
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
  const isLimited = requestCount >= RATE_LIMIT.maxRequests;
  
  // 计算剩余请求数
  const remaining = Math.max(0, RATE_LIMIT.maxRequests - requestCount);
  
  // 日志记录
  console.log(`[速率限制] IP: ${ip}, 10分钟内已请求: ${requestCount}/${RATE_LIMIT.maxRequests}, 剩余: ${remaining}, 限制状态: ${isLimited}`);
  
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
  const now = Date.now();
  
  // 如果IP不在记录中，添加新记录
  if (!ipRequestsMap.has(ip)) {
    ipRequestsMap.set(ip, []);
  }
  
  const requests = ipRequestsMap.get(ip);
  requests.push({ timestamp: now, count: 1 });
  
  // 保持记录最新，只保留10分钟内的记录
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
  const now = Date.now();
  const stats = [];
  
  ipRequestsMap.forEach((requests, ip) => {
    // 只统计10分钟内的请求
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
        remaining: Math.max(0, RATE_LIMIT.maxRequests - count),
        limited: count >= RATE_LIMIT.maxRequests,
        resetTime
      });
    }
  });
  
  return stats;
}

// 定期清理过期数据
setInterval(() => {
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