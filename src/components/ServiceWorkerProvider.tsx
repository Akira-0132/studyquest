'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // next-pwaが自動でService Workerを登録するため、手動登録は削除
    // 代わりにService Workerの準備を待つ
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // next-pwaによる自動登録の完了を待つ
      navigator.serviceWorker.ready
        .then((registration) => {
          console.log('Service Worker ready (via next-pwa):', registration);
          
          // プッシュ通知の購読
          if ('PushManager' in window) {
            setupPushNotifications(registration);
          }
        })
        .catch((error) => {
          console.log('Service Worker ready failed:', error);
        });
    }

    // PWAインストールプロンプト（ブラウザ環境でのみ実行）
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        // インストールプロンプトを保存
        (window as any).deferredPrompt = e;
      });
    }
  }, []);

  const setupPushNotifications = async (registration: ServiceWorkerRegistration) => {
    try {
      // 通知権限をチェック
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      // 既存の購読があるかチェック
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Push subscription already exists:', existingSubscription);
        localStorage.setItem('push_subscription', JSON.stringify(existingSubscription));
        return;
      }

      // MVP版では基本的な通知のみを使用（プッシュサーバーは不要）
      console.log('Basic notification support enabled');
      localStorage.setItem('notifications_supported', 'true');
      
    } catch (error) {
      console.log('Push notifications not supported or failed to setup:', error);
      // エラーでもアプリは正常に動作させる
      localStorage.setItem('notifications_supported', 'false');
    }
  };

  return <>{children}</>;
}

// VAPID鍵をUint8Arrayに変換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}