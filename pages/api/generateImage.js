// pages/api/generateImage.js

import * as fal from "@fal-ai/serverless-client";
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Fetching the image from the result
import { uploadFile } from '../../utils/minioClient';

// 定义多个FAL_KEY
const FAL_KEYS = process.env.FAL_KEYS ? process.env.FAL_KEYS.split(',') : [];
let currentKeyIndex = 0;

// 屏蔽中间部分的密钥
function maskKey(key) {
    if (!key || key.length < 10) return '******';
    const prefix = key.substring(0, 5);
    const suffix = key.substring(key.length - 3);
    return `${prefix}${'*'.repeat(key.length - 8)}${suffix}`;
}

// 获取下一个可用的FAL_KEY
function getNextFalKey() {
    if (FAL_KEYS.length === 0) {
        throw new Error('No FAL keys available');
    }
    const key = FAL_KEYS[currentKeyIndex];
    const keyIndexInfo = `${currentKeyIndex + 1}/${FAL_KEYS.length}`;
    console.log(`[FAL-Key] 当前使用第 ${keyIndexInfo} 个密钥`);
    
    // 增加索引以便下次使用下一个密钥
    const prevIndex = currentKeyIndex;
    currentKeyIndex = (currentKeyIndex + 1) % FAL_KEYS.length;
    
    return { 
        key, 
        keyIndex: prevIndex,
        totalKeys: FAL_KEYS.length,
        maskedKey: maskKey(key)
    };
}

// 保存图像元数据到JSON文件
function saveImageMetadata(userId, imageName, prompt, imageUrl) {
    try {
        const metadataDir = path.join(process.cwd(), 'public', 'metadata');
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true });
        }
        
        const metadataPath = path.join(metadataDir, 'image_history.json');
        let imageHistory = [];
        
        // 如果文件已存在，读取现有数据
        if (fs.existsSync(metadataPath)) {
            const data = fs.readFileSync(metadataPath, 'utf8');
            imageHistory = JSON.parse(data);
        }
        
        // 添加新的图像记录 - 包含MinIO URL
        imageHistory.push({
            userId,
            imageName,
            prompt,
            timestamp: Date.now(),
            imageUrl // 存储MinIO URL
        });
        
        // 保存更新后的数据
        fs.writeFileSync(metadataPath, JSON.stringify(imageHistory, null, 2));
        console.log(`[用户历史] 已保存图像元数据: ${userId} - ${imageName}`);
    } catch (error) {
        console.error(`[用户历史] 保存元数据时出错: ${error.message}`);
    }
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const {
        prompt,
        image_size,
        num_inference_steps,
        guidance_scale,
        num_images,
        enable_safety_checker,
        strength,
        output_format,
        sync_mode,
        model,
        userId, // 新增用户ID参数
        loras = [] // Default to an empty array if not provided
    } = req.body;

    try {
        // 获取下一个FAL_KEY并配置
        const keyInfo = getNextFalKey();
        console.log(`[FAL-Key] 开始处理请求，使用密钥: ${keyInfo.maskedKey}`);
        
        fal.config({
            credentials: keyInfo.key,
        });

        const result = await fal.subscribe(model, {
            input: {
                prompt,
                image_size,
                num_inference_steps,
                guidance_scale,
                num_images,
                enable_safety_checker,
                strength,
                output_format,
                loras: loras.length > 0 ? loras : undefined, // Only include loras if it's not empty
            },
            sync_mode,
        });

        const imageUrl = result.images[0].url;
        const imageResponse = await fetch(imageUrl); // Fetch the image from the result URL
        const buffer = await imageResponse.buffer(); // Convert to a buffer

        // 生成文件名
        const imageName = `${userId}-${Date.now()}.jpeg`; // 在文件名中包含用户ID
        
        // 上传到MinIO而不是本地文件系统
        const uploadResult = await uploadFile(buffer, imageName);
        
        if (!uploadResult.success) {
            throw new Error(`上传到MinIO失败: ${uploadResult.error}`);
        }
        
        console.log(`[MinIO] 图像上传成功: ${imageName}, URL: ${uploadResult.url}`);
        
        // 保存图像元数据 - 包含MinIO URL
        saveImageMetadata(userId, imageName, prompt, uploadResult.url);

        // Return MinIO URL instead of local file path
        res.status(200).json({ 
            message: 'Image generated and saved!', 
            imageUrl: uploadResult.url, // 直接使用MinIO URL
            originalName: imageName, // 保留原始文件名
            keyInfo: {
                maskedKey: keyInfo.maskedKey,
                keyIndex: keyInfo.keyIndex + 1, // 对用户展示从1开始计数
                totalKeys: keyInfo.totalKeys
            },
            userId: userId
        });
    } catch (error) {
        console.error(`[FAL-Key] 错误: ${error.message}`);
        
        // 获取当前密钥信息
        const failedKeyIndex = (currentKeyIndex === 0 ? FAL_KEYS.length - 1 : currentKeyIndex - 1);
        const failedKey = FAL_KEYS[failedKeyIndex];
        const maskedFailedKey = maskKey(failedKey);
        
        console.error(`[FAL-Key] 失败的密钥索引: ${failedKeyIndex + 1}/${FAL_KEYS.length}`);
        console.error(`[FAL-Key] 失败的密钥(部分): ${maskedFailedKey}`);
        
        res.status(500).json({ 
            message: "Failed to generate image", 
            error: error.message,
            keyInfo: {
                maskedKey: maskedFailedKey,
                keyIndex: failedKeyIndex + 1, // 对用户展示从1开始计数
                totalKeys: FAL_KEYS.length,
                status: 'failed'
            }
        });
    }
}