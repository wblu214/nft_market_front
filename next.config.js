/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // 本地开发时通过 Next 反向代理到后端，避免浏览器 CORS 限制。
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:2025/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
