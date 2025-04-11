#!/bin/sh
set -e

# 确保输出和元数据目录存在且有正确权限
mkdir -p /app/public/outputs /app/public/metadata
chmod -R 755 /app/public/outputs /app/public/metadata

# 检查环境变量
if [ -z "$FAL_KEYS" ]; then
  echo "警告: FAL_KEYS 环境变量未设置，应用可能无法正常工作"
else
  echo "检测到 FAL_KEYS 环境变量，共 $(echo $FAL_KEYS | tr ',' '\n' | wc -l) 个密钥"
fi

# 执行传入的命令，通常是 "node server.js"
exec "$@" 