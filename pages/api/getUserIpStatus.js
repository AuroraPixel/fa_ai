import { checkRateLimit, getRateLimitInfo } from '../../utils/rateLimit';

// 获取客户端真实IP地址
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    
    if (forwarded) {
        // 从转发的IP中获取第一个IP（通常是客户端真实IP）
        return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
        return realIp;
    }
    
    // 如果没有代理信息，则使用直接连接的IP
    return req.socket.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    // 虽然查询参数中有userId，但不需要验证权限，任何用户都能查询自己IP的限制状态
    const { userId } = req.query;
    
    if (!userId) {
        return res.status(400).json({ message: "Missing userId parameter" });
    }

    try {
        // 获取用户IP
        const clientIp = getClientIp(req);
        
        // 获取速率限制配置
        const rateLimitInfo = getRateLimitInfo();
        
        // 检查IP限制状态
        const ipStatus = checkRateLimit(clientIp);
        
        console.log(`[用户IP查询] 用户: ${userId}, IP: ${clientIp}, 状态: ${ipStatus.limited ? '已限制' : '正常'}, 剩余: ${ipStatus.remaining}/${rateLimitInfo.maxRequests}`);
        
        // 构建用户IP状态信息
        const ipInfo = {
            ip: clientIp,
            requestCount: rateLimitInfo.enabled ? (rateLimitInfo.maxRequests - ipStatus.remaining) : 0,
            remaining: ipStatus.remaining,
            limited: ipStatus.limited,
            resetTime: ipStatus.resetTime,
            resetTimeFormatted: ipStatus.resetTimeFormatted,
            limit: rateLimitInfo.maxRequests,
            enabled: rateLimitInfo.enabled,
            minutes: rateLimitInfo.minutes
        };
        
        return res.status(200).json({ 
            ipInfo,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error(`[API错误] 获取用户IP状态时出错: ${error.message}`);
        return res.status(500).json({ message: "获取IP状态失败", error: error.message });
    }
} 