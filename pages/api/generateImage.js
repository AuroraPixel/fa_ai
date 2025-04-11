// pages/api/generateImage.js

import * as fal from "@fal-ai/serverless-client";
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Fetching the image from the result

// 定义多个FAL_KEY
const FAL_KEYS = process.env.FAL_KEYS ? process.env.FAL_KEYS.split(',') : [];
let currentKeyIndex = 0;

// 获取下一个可用的FAL_KEY
function getNextFalKey() {
    if (FAL_KEYS.length === 0) {
        throw new Error('No FAL keys available');
    }
    const key = FAL_KEYS[currentKeyIndex];
    console.log(`[FAL-Key] 当前使用第 ${currentKeyIndex + 1}/${FAL_KEYS.length} 个密钥`);
    currentKeyIndex = (currentKeyIndex + 1) % FAL_KEYS.length;
    return key;
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
        loras = [] // Default to an empty array if not provided
    } = req.body;

    try {
        // 获取下一个FAL_KEY并配置
        const currentKey = getNextFalKey();
        console.log(`[FAL-Key] 开始处理请求，使用密钥: ${currentKey.substring(0, 4)}...`);
        
        fal.config({
            credentials: currentKey,
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

        const outputDir = path.join(process.cwd(), 'public', 'outputs'); // Save in the public/outputs directory
        const imageName = `generated-image-${Date.now()}.jpeg`;
        const outputFilePath = path.join(outputDir, imageName);

        // Ensure the outputs folder exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save the image buffer to a file in the outputs folder
        fs.writeFileSync(outputFilePath, buffer);
        console.log(`[FAL-Key] 图像生成成功，保存为: ${imageName}`);

        // Return a relative URL that the frontend can access
        res.status(200).json({ 
            message: 'Image generated and saved!', 
            imageUrl: `/outputs/${imageName}`,
            usedKey: currentKey.substring(0, 4) + '...',
            keyIndex: currentKeyIndex,
            totalKeys: FAL_KEYS.length
        });
    } catch (error) {
        console.error(`[FAL-Key] 错误: ${error.message}`);
        console.error(`[FAL-Key] 当前密钥索引: ${currentKeyIndex}`);
        res.status(500).json({ 
            message: "Failed to generate image", 
            error: error.message,
            currentKey: getNextFalKey().substring(0, 4) + '...',
            keyIndex: currentKeyIndex,
            totalKeys: FAL_KEYS.length
        });
    }
}