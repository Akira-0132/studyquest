'use client';

import { useEffect, useState, useCallback } from 'react';
import type { StudyQuestPushSubscription, StudyQuestServiceWorkerMessage } from '../../types/studyquest-notifications';

// StudyQuest PWA状態管理
interface StudyQuestPWAState {
  isServiceWorkerReady: boolean;
  isPushSupported: boolean;
  isNotificationPermissionGranted: boolean;
  isSubscribed: boolean;
  subscription: StudyQuestPushSubscription | null;
  isIOSPWA: boolean;
  installPromptAvailable: boolean;
}

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [pwaState, setPwaState] = useState<StudyQuestPWAState>({
    isServiceWorkerReady: false,
    isPushSupported: false,
    isNotificationPermissionGranted: false,
    isSubscribed: false,
    subscription: null,
    isIOSPWA: false,
    installPromptAvailable: false
  });

  // StudyQuest iOS PWA検出
  const detectIOSPWA = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInStandaloneMode = 'standalone' in (navigator as any) && (navigator as any).standalone;
    
    return isIOS && (isStandalone || isInStandaloneMode);
  }, []);

  // StudyQuest通知権限管理
  const requestStudyQuestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) {
        console.log('🚫 StudyQuest: Notifications not supported');
        return false;
      }

      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      const granted = permission === 'granted';
      setPwaState(prev => ({ ...prev, isNotificationPermissionGranted: granted }));
      
      console.log(`🔔 StudyQuest notification permission: ${permission}`);
      return granted;
      
    } catch (error) {
      console.error('❌ StudyQuest notification permission request failed:', error);
      return false;
    }
  }, []);

  // StudyQuest プッシュ通知サブスクリプション
  const setupStudyQuestPushSubscription = useCallback(async (registration: ServiceWorkerRegistration) => {
    try {
      console.log('📱 Setting up StudyQuest push subscription...');

      // 通知権限をリクエスト
      const hasPermission = await requestStudyQuestNotificationPermission();
      if (!hasPermission) {
        console.log('⚠️ StudyQuest: Cannot setup push without notification permission');
        return;
      }

      // 既存のサブスクリプションをチェック
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('✅ StudyQuest: Existing push subscription found');
        const studyQuestSubscription = existingSubscription as StudyQuestPushSubscription;
        
        // StudyQuest メタデータを追加
        studyQuestSubscription.metadata = {
          deviceType: detectDeviceType(),
          platform: detectPlatform(),
          browserType: detectBrowserType(),
          subscriptionDate: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          notificationPreferences: {
            studyReminders: true,
            examAlerts: true,
            streakNotifications: true,
            achievements: true,
            scheduleUpdates: true
          },
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language || 'ja'
        };

        setPwaState(prev => ({ 
          ...prev, 
          isSubscribed: true, 
          subscription: studyQuestSubscription 
        }));
        
        // ローカルストレージに保存
        localStorage.setItem('studyquest_push_subscription', JSON.stringify(studyQuestSubscription));
        return studyQuestSubscription;
      }

      // 新しいサブスクリプションを作成
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });

      console.log('🎉 StudyQuest: New push subscription created');
      
      const studyQuestSubscription = subscription as StudyQuestPushSubscription;
      studyQuestSubscription.metadata = {
        deviceType: detectDeviceType(),
        platform: detectPlatform(),
        browserType: detectBrowserType(),
        subscriptionDate: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        notificationPreferences: {
          studyReminders: true,
          examAlerts: true,
          streakNotifications: true,
          achievements: true,
          scheduleUpdates: true
        },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language || 'ja'
      };

      setPwaState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        subscription: studyQuestSubscription 
      }));
      
      // ローカルストレージに保存
      localStorage.setItem('studyquest_push_subscription', JSON.stringify(studyQuestSubscription));
      
      // サーバーに登録
      await registerSubscriptionWithServer(studyQuestSubscription);
      
      return studyQuestSubscription;
      
    } catch (error) {
      console.error('❌ StudyQuest push subscription setup failed:', error);
      setPwaState(prev => ({ ...prev, isSubscribed: false, subscription: null }));
    }
  }, [requestStudyQuestNotificationPermission]);

  // サーバーへのサブスクリプション登録
  const registerSubscriptionWithServer = useCallback(async (subscription: StudyQuestPushSubscription) => {
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          metadata: subscription.metadata,
          studyquestVersion: '1.0.0'
        }),
      });

      if (response.ok) {
        console.log('✅ StudyQuest subscription registered with server');
      } else {
        console.warn('⚠️ StudyQuest subscription registration failed:', response.status);
      }
    } catch (error) {
      console.error('❌ StudyQuest subscription registration error:', error);
    }
  }, []);

  // Service Worker メッセージハンドラー
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const message: StudyQuestServiceWorkerMessage = event.data;
    
    console.log('📨 StudyQuest Service Worker message:', message);
    
    switch (message.type) {
      case 'STUDYQUEST_NAVIGATE':
        // StudyQuest特化型ナビゲーション
        if (message.url) {
          window.location.href = message.url;
        }
        break;
        
      case 'STUDYQUEST_ACTION':
        // StudyQuest特化型アクション処理
        handleStudyQuestAction(message);
        break;
        
      case 'NOTIFICATION_DISPLAYED':
        console.log('🔔 StudyQuest notification displayed');
        break;
        
      default:
        console.log('📝 StudyQuest unhandled SW message:', message.type);
    }
  }, []);

  // StudyQuest アクション処理
  const handleStudyQuestAction = useCallback((message: StudyQuestServiceWorkerMessage) => {
    const { action, payload } = message;
    
    console.log(`🎮 StudyQuest action: ${action}`, payload);
    
    // アクション別処理をここに実装
    // 例: START_STUDY_SESSION, SNOOZE_NOTIFICATION, etc.
    
    // カスタムイベントとして発火（他のコンポーネントで利用可能）
    window.dispatchEvent(new CustomEvent('studyquest-action', {
      detail: { action, payload }
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // iOS PWA検出
    const isIOS = detectIOSPWA();
    setPwaState(prev => ({ ...prev, isIOSPWA: isIOS }));

    // Service Worker準備
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(async (registration) => {
          console.log('✅ StudyQuest Service Worker ready');
          setPwaState(prev => ({ ...prev, isServiceWorkerReady: true }));
          
          // プッシュ通知サポート確認
          if ('PushManager' in window) {
            setPwaState(prev => ({ ...prev, isPushSupported: true }));
            await setupStudyQuestPushSubscription(registration);
          }
          
          // Service Worker メッセージリスナー
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        })
        .catch((error) => {
          console.error('❌ StudyQuest Service Worker ready failed:', error);
        });
    }

    // PWAインストールプロンプト
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).studyQuestInstallPrompt = e;
      setPwaState(prev => ({ ...prev, installPromptAvailable: true }));
      console.log('📲 StudyQuest PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // クリーンアップ
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [setupStudyQuestPushSubscription, handleServiceWorkerMessage]);

  // PWA状態をグローバルに公開
  useEffect(() => {
    (window as any).studyQuestPWA = {
      state: pwaState,
      requestNotificationPermission: requestStudyQuestNotificationPermission,
      setupPushSubscription: setupStudyQuestPushSubscription
    };
  }, [pwaState, requestStudyQuestNotificationPermission, setupStudyQuestPushSubscription]);

  return <>{children}</>;
}

// StudyQuest デバイス・プラットフォーム検出ユーティリティ
function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/ipad|android(?=.*tablet)|tablet/.test(userAgent)) {
    return 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/.test(userAgent)) {
    return 'mobile';
  } else {
    return 'desktop';
  }
}

function detectPlatform(): 'ios' | 'android' | 'windows' | 'macos' | 'linux' {
  if (typeof window === 'undefined') return 'linux';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  } else if (/android/.test(userAgent)) {
    return 'android';
  } else if (/win/.test(userAgent)) {
    return 'windows';
  } else if (/mac/.test(userAgent)) {
    return 'macos';
  } else {
    return 'linux';
  }
}

function detectBrowserType(): 'safari' | 'chrome' | 'firefox' | 'edge' | 'other' {
  if (typeof window === 'undefined') return 'other';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    return 'safari';
  } else if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
    return 'chrome';
  } else if (/firefox/.test(userAgent)) {
    return 'firefox';
  } else if (/edge/.test(userAgent)) {
    return 'edge';
  } else {
    return 'other';
  }
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