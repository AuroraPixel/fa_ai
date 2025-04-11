#!/bin/bash

# 创建所需目录
mkdir -p docker-data/outputs
mkdir -p docker-data/metadata

# 设置权限
chmod -R 777 docker-data

# 启动Docker容器
docker-compose up -d

echo "容器已启动，请访问 http://localhost:3000" 