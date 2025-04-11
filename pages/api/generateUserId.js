import crypto from 'crypto';

// 生成唯一ID
function generateUniqueId() {
    // 生成8位的随机字符串
    const randomBytes = crypto.randomBytes(4);
    const randomHex = randomBytes.toString('hex');
    
    // 添加时间戳确保唯一性
    const timestamp = Date.now().toString(36);
    
    return `user-${randomHex}-${timestamp}`;
}

export default function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const uniqueId = generateUniqueId();
        console.log(`[用户系统] 生成新的用户ID: ${uniqueId}`);
        
        return res.status(200).json({ 
            userId: uniqueId,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error(`[API错误] 生成用户ID时出错: ${error.message}`);
        return res.status(500).json({ message: "Failed to generate user ID", error: error.message });
    }
} 