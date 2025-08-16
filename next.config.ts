import type { NextConfig } from "next";
import withPWA from 'next-pwa';

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

// next-pwaの設定
const pwaConfig = withPWA({
  dest: 'public',
  disable: false, // 一時的にdevelopmentでも有効にしてテスト
  register: true,
  scope: '/',
  sw: 'sw.js',
  // Import custom worker script
  importScripts: ['/worker.js'],
  // iOS PWA最適化設定
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'studyquest-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24時間
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'studyquest-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日間
        },
      },
    },
  ],
  // iOS対応の追加設定
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
});

export default pwaConfig(nextConfig);
