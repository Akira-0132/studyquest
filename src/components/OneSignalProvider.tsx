'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // OneSignalの初期化を待つ
    const initOneSignal = async () => {
      // 環境変数チェック
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      
      if (!appId || appId === 'YOUR_APP_ID_HERE') {
        console.warn('⚠️ OneSignal App IDが設定されていません');
        console.warn('Vercelの環境変数にNEXT_PUBLIC_ONESIGNAL_APP_IDを設定してください');
        return;
      }

      console.log('🔔 OneSignal初期化開始...');
      console.log('App ID:', appId.substring(0, 8) + '...');
      
      // OneSignalが読み込まれるまで待つ
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          // 初期化設定
          const initConfig = {
            appId: appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: {
              scope: "/",
              path: "/OneSignalSDKWorker.js"
            },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
            notifyButton: {
              enable: false
            },
            welcomeNotification: {
              title: "StudyQuest",
              message: "通知が有効になりました！",
              url: "https://studyquest.vercel.app"
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
              },
              native: {
                enabled: true,
                autoPrompt: false
              }
            }
          };

          console.log('OneSignal init with config:', initConfig);
          await OneSignal.init(initConfig);
          
          // デバッグ情報（安全な方法でチェック）
          let isPushSupported = false;
          try {
            isPushSupported = typeof OneSignal.getNotificationPermission === 'function';
          } catch (e) {
            isPushSupported = false;
          }
          console.log('OneSignal methods available:', isPushSupported);
          
          let isPushEnabled = false;
          try {
            isPushEnabled = await OneSignal.isPushNotificationsEnabled();
          } catch (e) {
            console.log('isPushNotificationsEnabled error:', e);
            isPushEnabled = false;
          }
          console.log('Push notifications enabled:', isPushEnabled);
          
          // 権限状態の確認
          const permission = await OneSignal.getNotificationPermission();
          console.log('Current permission state:', permission);
          
          // イベントリスナーの設定
          OneSignal.on('subscriptionChange', function(isSubscribed: boolean) {
            console.log('Subscription state changed to:', isSubscribed);
            
            // カスタムイベントを発火
            window.dispatchEvent(new CustomEvent('onesignal-subscription-change', {
              detail: { subscribed: isSubscribed }
            }));
            
            // ローカルストレージを更新
            const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
            settings.enabled = isSubscribed;
            localStorage.setItem('studyquest_notifications', JSON.stringify(settings));
          });
          
          OneSignal.on('permissionPromptDisplay', function() {
            console.log('Permission prompt displayed');
          });
          
          OneSignal.on('notificationDisplay', function(event: any) {
            console.log('Notification displayed:', event);
          });
          
          console.log('✅ OneSignal初期化完了');
          
        } catch (error) {
          console.error('❌ OneSignal初期化エラー:', error);
        }
      });
    };
    
    // 少し遅延させてからinitを実行
    const timer = setTimeout(initOneSignal, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Script
        id="onesignal-sdk"
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('OneSignal SDK loaded');
        }}
      />
      {children}
    </>
  );
}