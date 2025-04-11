import { getIpStats } from '../../utils/rateLimit';

// 允许访问的管理员ID
const ADMIN_ID = 'admin-wang';

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { userId } = req.query;

    // 验证管理员权限
    if (!userId || userId !== ADMIN_ID) {
        return res.status(403).json({ message: "无权访问此资源" });
    }

    try {
        // 获取所有IP的统计信息
        const stats = getIpStats();
        
        console.log(`[管理员] 获取IP统计信息, 共 ${stats.length} 个IP`);
        
        return res.status(200).json({ 
            stats,
            timestamp: Date.now(),
            config: {
                maxRequests: 5,
                windowMs: 10 * 60 * 1000 // 10分钟
            }
        });
    } catch (error) {
        console.error(`[API错误] 获取IP统计信息时出错: ${error.message}`);
        return res.status(500).json({ message: "获取IP统计信息失败", error: error.message });
    }
} 