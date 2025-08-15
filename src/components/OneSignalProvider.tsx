'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // App IDをチェック
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    console.log('OneSignal App ID:', appId ? `${appId.substring(0, 8)}...` : 'NOT SET');
    
    if (!appId || appId === "YOUR_APP_ID_HERE") {
      console.error('⚠️ OneSignal App IDが設定されていません！');
      console.error('1. OneSignalでアカウントを作成してApp IDを取得してください');
      console.error('2. Vercelの環境変数にNEXT_PUBLIC_ONESIGNAL_APP_IDを設定してください');
      // OneSignalなしでも動作するようにする
      return;
    }
    
    // OneSignal初期化
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        // 既に初期化されているかチェック
        const isInitialized = await OneSignal.initialized;
        if (isInitialized) {
          console.log('OneSignal already initialized');
          return;
        }

        console.log('Initializing OneSignal...');
        await OneSignal.init({
          appId: appId,
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
      
      console.log('OneSignal initialization complete');
    } catch (error) {
      console.error('OneSignal initialization error:', error);
    }
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