/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // 本地开发时通过 Next 反向代理到 Go Gin 后端，避免浏览器 CORS 限制。
  async rewrites() {
    return [
      {
        // 业务接口：统一前缀 /api/v1 -> Gin 后端 /api/v1
        source: '/api/v1/:path*',
        destination: 'http://localhost:8080/api/v1/:path*',
      },
      {
        // 健康检查：/health -> Gin 后端 /health
        source: '/health',
        destination: 'http://localhost:8080/health',
      },
    ];
  },
};

module.exports = nextConfig;
