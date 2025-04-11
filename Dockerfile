# 使用官方Node.js镜像作为基础镜像
FROM node:18-alpine AS base

# 创建应用目录
WORKDIR /app

# 安装依赖阶段
FROM base AS deps
# 安装需要的系统包，比如git和构建工具
RUN apk add --no-cache libc6-compat

# 复制package.json和package-lock.json
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
# 从deps阶段复制node_modules
COPY --from=deps /app/node_modules ./node_modules
# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV production
# 创建一个非root用户运行应用
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建必要的目录并设置权限
RUN mkdir -p public/outputs public/metadata
RUN chown -R nextjs:nodejs public/outputs public/metadata

# 从构建阶段复制构建结果
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置用户
USER nextjs

# 定义环境变量（将在运行时覆盖）
ENV FAL_KEYS=""

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"] 