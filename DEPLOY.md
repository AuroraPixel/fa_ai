# FAL-AI Web UI 部署指南

本指南将帮助您在不同环境中部署FAL-AI Web UI应用。

## 系统要求

- Docker 20.10.0 或更高版本
- Docker Compose 3.0 或更高版本（可选，用于本地部署）
- 至少 1GB 空闲内存
- 至少 1GB 磁盘空间

## 环境变量

应用需要配置以下环境变量：

- `FAL_KEYS`: FAL.ai API密钥，多个密钥用逗号分隔(必需)

## 部署方式

### 方式1: 使用Docker Compose (本地开发或测试)

1. 克隆代码仓库：
   ```bash
   git clone <repository-url>
   cd fal-ai-web-ui
   ```

2. 设置环境变量：
   ```bash
   # Linux/Mac
   export FAL_KEYS="your-key-1,your-key-2"
   
   # Windows (PowerShell)
   $env:FAL_KEYS="your-key-1,your-key-2"
   ```

3. 构建并启动容器：
   ```bash
   docker-compose up -d
   ```

4. 访问应用：
   浏览器打开 http://localhost:3000

### 方式2: 使用Docker (Zeaber云平台)

1. 构建Docker镜像：
   ```bash
   docker build -t fal-ai-web-ui .
   ```

2. 推送到您的Docker仓库：
   ```bash
   docker tag fal-ai-web-ui <your-registry>/fal-ai-web-ui:latest
   docker push <your-registry>/fal-ai-web-ui:latest
   ```

3. 在Zeaber云平台部署：
   - 创建新应用
   - 选择Docker镜像: `<your-registry>/fal-ai-web-ui:latest`
   - 设置端口: `3000`
   - 添加环境变量: `FAL_KEYS=your-key-1,your-key-2`
   - 创建持久化存储:
     - `/app/public/outputs`: 存储生成的图片
     - `/app/public/metadata`: 存储图片元数据
   - 部署应用

## 数据持久化

应用会将生成的图片保存在 `/app/public/outputs` 目录，将元数据保存在 `/app/public/metadata` 目录。
在Docker Compose配置中，我们使用了命名卷来持久化这些数据。
在Zeaber云平台，需要创建持久化存储并挂载到这些路径。

## 健康检查

健康检查会定期检测应用是否正常运行。配置如下：

- 检测URL: `http://localhost:3000`
- 间隔时间: 30秒
- 超时时间: 10秒
- 失败重试次数: 3次
- 启动等待时间: 40秒

## 故障排除

1. 如果应用无法启动，检查日志：
   ```bash
   docker-compose logs -f fal-ai-web-ui
   ```

2. 检查FAL_KEYS环境变量是否正确配置：
   ```bash
   docker-compose exec fal-ai-web-ui printenv | grep FAL_KEYS
   ```

3. 检查存储卷权限：
   ```bash
   docker-compose exec fal-ai-web-ui ls -la /app/public/outputs
   docker-compose exec fal-ai-web-ui ls -la /app/public/metadata
   ```

## 自定义构建

如需自定义构建，可修改 `Dockerfile` 和 `docker-compose.yml` 文件。 