import * as Minio from 'minio';

// 从环境变量获取MinIO配置
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 's3.cortexai.info';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '443');
const MINIO_USE_SSL = process.env.MINIO_USE_SSL !== 'false';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minio';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'rL4svPKZ7T1N6RI9jEzU23nqi0mu5X8M';
const BUCKET_NAME = process.env.MINIO_BUCKET || 'txtxtxtxt1';

// MinIO 客户端配置
const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY
});

console.log(`[MinIO] 初始化客户端: ${MINIO_ENDPOINT}:${MINIO_PORT}, 使用SSL: ${MINIO_USE_SSL}, 桶: ${BUCKET_NAME}`);

// 桶名称
export const bucketName = BUCKET_NAME;

// 确保桶存在
export const ensureBucketExists = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      console.log(`[MinIO] 创建桶 ${bucketName}`);
      await minioClient.makeBucket(bucketName);
    }
  } catch (error) {
    console.error(`[MinIO] 确保桶存在时出错: ${error.message}`);
  }
};

// 上传文件到MinIO
export const uploadFile = async (buffer, fileName, contentType = 'image/jpeg') => {
  try {
    await ensureBucketExists();
    
    // 上传图片
    await minioClient.putObject(bucketName, fileName, buffer, buffer.length, {
      'Content-Type': contentType
    });
    
    // 获取图片URL
    const url = await getFileUrl(fileName);
    
    return { success: true, url };
  } catch (error) {
    console.error(`[MinIO] 上传文件时出错: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// 获取文件URL (预签名URL，有效期7天)
export const getFileUrl = async (fileName) => {
  try {
    const url = await minioClient.presignedGetObject(bucketName, fileName, 60 * 60 * 24 * 7); // 7天有效期
    return url;
  } catch (error) {
    console.error(`[MinIO] 获取文件URL时出错: ${error.message}`);
    throw error;
  }
};

// 检查文件是否存在
export const fileExists = async (fileName) => {
  try {
    await minioClient.statObject(bucketName, fileName);
    return true;
  } catch (error) {
    return false;
  }
};

// 删除文件
export const deleteFile = async (fileName) => {
  try {
    await minioClient.removeObject(bucketName, fileName);
    return { success: true };
  } catch (error) {
    console.error(`[MinIO] 删除文件时出错: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export default minioClient; 