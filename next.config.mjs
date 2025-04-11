/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 启用独立输出模式，适合Docker部署
  experimental: {
    // 配置独立输出
    outputFileTracing: true,
  },
};

export default nextConfig;
