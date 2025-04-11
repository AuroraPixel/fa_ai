#!/bin/sh
set -e

# 确保元数据目录存在且有正确权限
mkdir -p /app/public/metadata
chmod -R 755 /app/public/metadata

# 检查环境变量
if [ -z "$FAL_KEYS" ]; then
  echo "警告: FAL_KEYS 环境变量未设置，应用可能无法正常工作"
else
  echo "检测到 FAL_KEYS 环境变量，共 $(echo $FAL_KEYS | tr ',' '\n' | wc -l) 个密钥"
fi

# 检查MinIO环境变量
if [ -z "$MINIO_ENDPOINT" ] || [ -z "$MINIO_ACCESS_KEY" ] || [ -z "$MINIO_SECRET_KEY" ] || [ -z "$MINIO_BUCKET" ]; then
  echo "警告: MinIO 环境变量未完全设置，图片存储可能无法正常工作"
else
  echo "检测到 MinIO 配置: 端点=$MINIO_ENDPOINT, 桶=$MINIO_BUCKET"
fi

# 执行传入的命令，通常是 "node server.js"
exec "$@" 