import fs from 'fs';
import path from 'path';

const ADMIN_ID = 'admin-wang'; // 管理员ID

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "Missing userId parameter" });
    }

    try {
        const metadataPath = path.join(process.cwd(), 'public', 'metadata', 'image_history.json');
        
        // 如果元数据文件不存在，返回空数组
        if (!fs.existsSync(metadataPath)) {
            return res.status(200).json({ images: [] });
        }

        // 读取所有图像历史记录
        const data = fs.readFileSync(metadataPath, 'utf8');
        const allImageHistory = JSON.parse(data);

        let images;
        
        // 如果是管理员ID，返回所有图像历史
        if (userId === ADMIN_ID) {
            console.log(`[管理员访问] 返回所有用户的图像历史`);
            images = allImageHistory;
        } else {
            // 否则，只返回该用户的图像历史
            images = allImageHistory.filter(item => item.userId === userId);
            console.log(`[用户访问] 返回用户 ${userId} 的图像历史，共 ${images.length} 张图像`);
        }

        // 按时间戳排序（最新的在前）
        images.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({ 
            images,
            isAdmin: userId === ADMIN_ID
        });
    } catch (error) {
        console.error(`[API错误] 获取图像历史时出错: ${error.message}`);
        return res.status(500).json({ message: "Failed to get image history", error: error.message });
    }
} 