import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA設定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  
  // モバイル最適化
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  
  // パフォーマンス最適化
  // experimental: {
  //   optimizeCss: true,
  // },
  
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
