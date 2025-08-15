'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // OneSignal初期化
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      // 既に初期化されている場合はスキップ
      if (await OneSignal.isPushNotificationsEnabled()) {
        console.log('OneSignal already initialized');
        return;
      }

      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "YOUR_APP_ID_HERE",
        safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: true,
        welcomeNotification: {
          title: "StudyQuest",
          message: "通知が有効になりました！学習リマインダーをお送りします。"
        },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false,
                text: {
                  actionMessage: "StudyQuestから学習リマインダーを受け取りますか？",
                  acceptButton: "許可する",
                  cancelButton: "今はしない"
                },
                delay: {
                  pageViews: 1,
                  timeDelay: 3
                }
              }
            ]
          }
        },
        notifyButton: {
          enable: false
        }
      });

      // ユーザータグを設定（学習設定用）
      const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
      if (settings.enabled) {
        await OneSignal.User.addTags({
          notification_enabled: "true",
          morning_time: settings.morning || "07:00",
          afternoon_time: settings.afternoon || "16:00",
          evening_time: settings.evening || "20:00"
        });
      }

      // 通知権限状態の監視
      OneSignal.Notifications.addEventListener('permissionChange', function(permission: boolean) {
        console.log('OneSignal permission changed:', permission);
        
        // ローカルストレージを更新
        const currentSettings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
        currentSettings.enabled = permission;
        localStorage.setItem('studyquest_notifications', JSON.stringify(currentSettings));
        
        // カスタムイベントを発火（設定ページの更新用）
        window.dispatchEvent(new CustomEvent('onesignal-permission-change', { detail: { enabled: permission } }));
      });

      // 通知クリックイベント
      OneSignal.Notifications.addEventListener('click', function(event: any) {
        console.log('OneSignal notification clicked:', event);
        // アプリ内の特定ページへナビゲート
        if (event.notification.data && event.notification.data.page) {
          window.location.href = event.notification.data.page;
        }
      });
    });
  }, []);

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}

// TypeScript用のグローバル型定義
declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}