import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { OneSignalProvider } from "@/components/OneSignalProvider";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StudyQuest - 中学生向け試験対策アプリ",
  description: "ゲーミフィケーションで楽しく勉強できる中学生向け試験対策アプリ",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body
        className={`${notoSansJP.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen`}
      >
        <ServiceWorkerProvider>
          <OneSignalProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-1 pb-16">
                {children}
              </main>
              <Navigation />
            </div>
          </OneSignalProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
