import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { StudyQuestNotificationRouter } from "@/components/StudyQuestNotificationRouter";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StudyQuest - 中学生向け試験対策アプリ",
  description: "ゲーミフィケーションで楽しく勉強できる中学生向け試験対策アプリ。試験スケジュールの管理、自動学習プラン生成、ストリーク機能で継続的な学習をサポート。",
  manifest: "/manifest.json",
  
  // SEO and PWA optimization
  keywords: [
    "StudyQuest", "中学生", "試験対策", "学習管理", "ゲーミフィケーション", 
    "勉強", "スケジュール", "ストリーク", "PWA", "学習アプリ"
  ],
  authors: [{ name: "StudyQuest Team" }],
  creator: "StudyQuest",
  publisher: "StudyQuest",
  
  // Open Graph for social sharing
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://studyquest.vercel.app",
    siteName: "StudyQuest",
    title: "StudyQuest - 中学生向け試験対策アプリ",
    description: "ゲーミフィケーションで楽しく勉強できる中学生向け試験対策アプリ",
    images: [
      {
        url: "/icon-192x192.png",
        width: 192,
        height: 192,
        alt: "StudyQuest App Icon",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary",
    title: "StudyQuest - 中学生向け試験対策アプリ",
    description: "ゲーミフィケーションで楽しく勉強できる中学生向け試験対策アプリ",
    images: ["/icon-192x192.png"],
  },
  
  // App-specific metadata
  applicationName: "StudyQuest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudyQuest",
  },
  
  // Additional PWA metadata
  other: {
    // iOS Safari PWA optimization
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "StudyQuest",
    "mobile-web-app-capable": "yes",
    "application-name": "StudyQuest",
    
    // Microsoft Edge/Windows
    "msapplication-TileColor": "#6366F1",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-navbutton-color": "#6366F1",
    "msapplication-starturl": "/",
    
    // Android Chrome
    "theme-color": "#6366F1",
    "background-color": "#111827",
    
    // Additional PWA hints
    "display": "standalone",
    "orientation": "portrait-primary",
    
    // StudyQuest specific meta
    "studyquest-version": "1.0.0",
    "studyquest-target": "middle-school-students",
    "studyquest-features": "gamification,notifications,offline-support",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366F1",
  colorScheme: "dark light",
  viewportFit: "cover", // iOS PWA full screen support
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <head>
        {/* iOS Safari PWA specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StudyQuest" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* iOS Safari PWA icon links */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icon-96x96.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
        
        {/* iOS Safari PWA startup images */}
        <link rel="apple-touch-startup-image" href="/icon-192x192.png" />
        
        {/* Standard PWA icons */}
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        
        {/* Microsoft specific */}
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
        <meta name="msapplication-TileColor" content="#6366F1" />
        <meta name="msapplication-navbutton-color" content="#6366F1" />
        <meta name="msapplication-starturl" content="/" />
        
        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="StudyQuest" />
        
        {/* PWA display hints */}
        <meta name="display" content="standalone" />
        
        {/* Prevent zooming on input focus (iOS) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        
        {/* StudyQuest specific configuration */}
        <meta name="studyquest-pwa-optimized" content="true" />
        <meta name="studyquest-ios-safari-ready" content="true" />
        <meta name="studyquest-notification-supported" content="true" />
        
        {/* Preconnect to improve performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="//studyquest.vercel.app" />
        
        {/* Structured data for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MobileApplication",
              "name": "StudyQuest",
              "description": "ゲーミフィケーションで楽しく勉強できる中学生向け試験対策アプリ",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "All",
              "url": "https://studyquest.vercel.app",
              "author": {
                "@type": "Organization",
                "name": "StudyQuest Team"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "JPY"
              }
            })
          }}
        />
      </head>
      <body
        className={`${notoSansJP.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen`}
      >
        <ServiceWorkerProvider>
          <Suspense fallback={null}>
            <StudyQuestNotificationRouter />
          </Suspense>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1 pb-16">
              {children}
            </main>
            <Navigation />
          </div>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
