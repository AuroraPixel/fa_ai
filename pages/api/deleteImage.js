import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { imageName } = req.query;

    if (!imageName) {
        return res.status(400).json({ message: "Missing imageName parameter" });
    }

    try {
        // 图片文件路径
        const imagePath = path.join(process.cwd(), 'public', 'outputs', imageName);
        
        // 元数据文件路径
        const metadataPath = path.join(process.cwd(), 'public', 'metadata', 'image_history.json');
        
        // 检查图片是否存在
        if (fs.existsSync(imagePath)) {
            // 删除图片文件
            fs.unlinkSync(imagePath);
            console.log(`[删除图片] 已删除图片: ${imageName}`);
        } else {
            console.log(`[删除图片] 图片不存在: ${imageName}`);
        }
        
        // 从元数据中删除图片记录
        if (fs.existsSync(metadataPath)) {
            const data = fs.readFileSync(metadataPath, 'utf8');
            let imageHistory = JSON.parse(data);
            
            // 过滤掉要删除的图片
            const newImageHistory = imageHistory.filter(item => item.imageName !== imageName);
            
            // 保存更新后的元数据
            fs.writeFileSync(metadataPath, JSON.stringify(newImageHistory, null, 2));
            console.log(`[删除图片] 已从元数据中移除记录: ${imageName}`);
        }
        
        return res.status(200).json({ message: "图片删除成功" });
    } catch (error) {
        console.error(`[API错误] 删除图片出错: ${error.message}`);
        return res.status(500).json({ message: "删除图片失败", error: error.message });
    }
} 