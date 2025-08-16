// iOS Safari PWA対応 ネイティブWeb Push API管理システム

// VAPIDキー（公開鍵）- 環境変数から読み込み
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0';

/**
 * iOS Safari PWA環境チェック
 */
export function isiOSSafariPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  return isIOS && (isStandalone || isSafari);
}

/**
 * PWAインストール状態チェック
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         window.matchMedia('(display-mode: minimal-ui)').matches;
}

/**
 * iOS PWA通知サポートチェック
 */
export function isiOSNotificationSupported(): { 
  supported: boolean; 
  reason?: string; 
  recommendations?: string[] 
} {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side environment' };
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (!isIOS) {
    return { supported: true, reason: 'Non-iOS device' };
  }

  // iOS 16.4未満はサポート外
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    if (major < 16 || (major === 16 && minor < 4)) {
      return { 
        supported: false, 
        reason: `iOS ${major}.${minor} is not supported`,
        recommendations: ['iOS 16.4以降にアップデートしてください'] 
      };
    }
  }

  // PWAインストール必須
  const isPWA = isPWAInstalled();
  if (!isPWA) {
    return { 
      supported: false, 
      reason: 'PWA not installed',
      recommendations: [
        'ホーム画面にアプリを追加してください',
        'Safari→共有→ホーム画面に追加'
      ] 
    };
  }

  // Service Worker確認
  if (!('serviceWorker' in navigator)) {
    return { 
      supported: false, 
      reason: 'Service Worker not supported',
      recommendations: ['ブラウザを最新版にアップデートしてください'] 
    };
  }

  // Notification API確認
  if (!('Notification' in window)) {
    return { 
      supported: false, 
      reason: 'Notification API not supported',
      recommendations: ['ブラウザを最新版にアップデートしてください'] 
    };
  }

  // PushManager確認
  if (!('PushManager' in window)) {
    return { 
      supported: false, 
      reason: 'PushManager not supported',
      recommendations: ['ブラウザを最新版にアップデートしてください'] 
    };
  }

  return { supported: true };
}

/**
 * Service Worker待機（next-pwa対応版）
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  console.log('🔄 Service Worker waiting for next-pwa registration (iOS PWA optimized)...');
  
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker not supported in this browser');
    return null;
  }

  try {
    // iOS環境診断
    const isIOS = isiOSSafariPWA();
    const isPWA = isPWAInstalled();
    const notificationSupport = isiOSNotificationSupported();
    
    console.log('📋 iOS PWA Environment Check:');
    console.log('- iOS Device:', isIOS);
    console.log('- PWA Mode:', isPWA);
    console.log('- Notification Support:', notificationSupport);
    console.log('- User Agent:', navigator.userAgent.substring(0, 50) + '...');
    
    console.log('📋 Browser API Support:');
    console.log('- serviceWorker:', 'serviceWorker' in navigator);
    console.log('- PushManager:', 'PushManager' in window);
    console.log('- Notification:', 'Notification' in window);
    console.log('- Background Sync:', 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype);
    
    // next-pwaによる自動登録の完了を待つ
    const registration = await navigator.serviceWorker.ready;
    
    console.log('✅ Service Worker ready (next-pwa managed)!');
    console.log('- Scope:', registration.scope);
    console.log('- Active:', !!registration.active);
    console.log('- Installing:', !!registration.installing);
    console.log('- Waiting:', !!registration.waiting);
    console.log('- Update found:', !!registration.waiting);
    
    // iOS特有のPushManagerバグ対策
    if (isIOS && registration.pushManager) {
      try {
        const existingSubscription = await registration.pushManager.getSubscription();
        console.log('📱 iOS PushManager status:', {
          available: !!registration.pushManager,
          subscription: !!existingSubscription
        });
      } catch (pushError) {
        console.warn('⚠️ iOS PushManager access issue (known bug):', pushError);
      }
    }
    
    // Service Workerがアクティブになるまで待機（iOS対応）
    if (!registration.active && (registration.installing || registration.waiting)) {
      console.log('⏳ Waiting for Service Worker to become active...');
      
      await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 100; // 10秒
        
        const checkState = () => {
          attempts++;
          
          if (registration.active) {
            console.log('✅ Service Worker is now active');
            resolve(void 0);
          } else if (attempts >= maxAttempts) {
            console.warn('⚠️ Service Worker activation timeout (iOS limitation)');
            resolve(void 0);
          } else {
            setTimeout(checkState, 100);
          }
        };
        
        checkState();
      });
    }
    
    // iOS向けのUpdate処理
    if (registration.waiting) {
      console.log('🔄 Service Worker update available, activating...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    console.error('- Error message:', (error as Error).message);
    console.error('- Error stack:', (error as Error).stack);
    
    // iOS固有のエラー分析
    if (isiOSSafariPWA() && (error as Error).message.includes('Import')) {
      console.error('💡 This might be an iOS Safari importScripts limitation');
    }
    
    return null;
  }
}

/**
 * プッシュ通知の購読（iOS PWA対応強化版）
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  console.log('🔔 Starting push subscription process (iOS PWA optimized)...');
  
  try {
    // iOS環境事前チェック
    const notificationSupport = isiOSNotificationSupported();
    if (!notificationSupport.supported) {
      console.error('❌ iOS notification requirements not met:', notificationSupport);
      throw new Error(`iOS requirement failed: ${notificationSupport.reason}`);
    }
    
    // Service Worker登録
    console.log('📋 Step 1: Service Worker registration');
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Cannot proceed without Service Worker');
    }

    // iOS特有のPushManagerバグ対策
    console.log('📋 Step 2: iOS PushManager validation');
    if (!registration.pushManager) {
      console.error('❌ PushManager not available');
      
      // iOS Safari再起動推奨メッセージ
      if (isiOSSafariPWA()) {
        throw new Error('iOS Safari PushManager bug detected. Please close and reopen Safari/PWA.');
      }
      
      throw new Error('PushManager not supported');
    }
    
    // iOS PWA特有の待機処理
    if (isiOSSafariPWA()) {
      console.log('📱 iOS PWA detected, applying stability measures...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }
    
    console.log('✅ PushManager is available');

    // 既存購読確認（iOS対応）
    console.log('📋 Step 3: Checking existing subscription');
    let subscription: PushSubscription | null = null;
    
    try {
      subscription = await registration.pushManager.getSubscription();
    } catch (getSubscriptionError) {
      console.warn('⚠️ Failed to get existing subscription (iOS bug):', getSubscriptionError);
      // iOS特有のバグの場合、新規作成を試行
    }
    
    if (subscription) {
      console.log('✅ Found existing push subscription');
      console.log('- Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      console.log('- Keys available:', {
        p256dh: !!subscription.getKey('p256dh'),
        auth: !!subscription.getKey('auth')
      });
      
      // iOS向け：購読の有効性チェック
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: safeSubscriptionToJSON(subscription),
            title: 'Test',
            body: 'Subscription validation'
          })
        });
        console.log('✅ Existing subscription is valid');
      } catch (validationError) {
        console.warn('⚠️ Existing subscription validation failed, creating new one');
        subscription = null;
      }
    }
    
    if (!subscription) {
      console.log('📝 Creating new subscription...');
      
      // VAPIDキー確認
      console.log('📋 Step 4: VAPID key validation');
      console.log('- VAPID key length:', VAPID_PUBLIC_KEY.length);
      console.log('- VAPID key preview:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
      
      let vapidBytes: Uint8Array;
      try {
        vapidBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        console.log('✅ VAPID key converted successfully');
        console.log('- Converted length:', vapidBytes.length);
        
        if (vapidBytes.length !== 65) {
          throw new Error(`Invalid VAPID key length. Expected 65 bytes, got: ${vapidBytes.length}`);
        }
      } catch (vapidError) {
        console.error('❌ VAPID key conversion failed:', vapidError);
        throw vapidError;
      }
      
      // 新規購読作成（iOS対応）
      console.log('📋 Step 5: Creating new push subscription');
      try {
        // iOS向けのタイムアウト処理
        const subscriptionPromise = registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidBytes as BufferSource
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Subscription timeout (iOS limitation)')), 30000);
        });
        
        subscription = await Promise.race([subscriptionPromise, timeoutPromise]);
        
        console.log('✅ Push subscription created successfully!');
        console.log('- Endpoint:', subscription.endpoint.substring(0, 50) + '...');
        console.log('- p256dh key length:', subscription.getKey('p256dh')?.byteLength);
        console.log('- auth key length:', subscription.getKey('auth')?.byteLength);
        
      } catch (subscribeError) {
        console.error('❌ Push subscription creation failed:', subscribeError);
        console.error('- Error name:', (subscribeError as Error).name);
        console.error('- Error message:', (subscribeError as Error).message);
        
        // iOS固有のエラー分析
        if ((subscribeError as Error).name === 'NotSupportedError') {
          throw new Error('iOS Safari PWA limitation: Ensure app is installed to home screen and permissions are granted');
        } else if ((subscribeError as Error).name === 'InvalidStateError') {
          throw new Error('iOS Safari bug: Please close and reopen the PWA');
        } else if ((subscribeError as Error).message.includes('timeout')) {
          throw new Error('iOS subscription timeout: Please try again');
        }
        
        throw subscribeError;
      }
    }

    // サーバー保存
    console.log('📋 Step 6: Saving subscription to server');
    await saveSubscriptionToServer(subscription);
    
    console.log('🎉 Push subscription process completed successfully!');
    return subscription;

  } catch (error) {
    console.error('❌ Push subscription process failed:', error);
    console.error('- Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack?.substring(0, 200)
    });
    
    // iOS固有のエラーレポート
    if (isiOSSafariPWA()) {
      console.error('📱 iOS PWA Debugging Info:', {
        isPWA: isPWAInstalled(),
        userAgent: navigator.userAgent,
        pushManagerAvailable: !!(await navigator.serviceWorker.getRegistration())?.pushManager
      });
    }
    
    return null;
  }
}

/**
 * プッシュ購読を解除
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const success = await subscription.unsubscribe();
    console.log('Push unsubscribed:', success);
    
    if (success) {
      // サーバーから購読情報を削除
      await removeSubscriptionFromServer(subscription);
    }
    
    return success;
  } catch (error) {
    console.error('Push unsubscribe failed:', error);
    return false;
  }
}

/**
 * テスト通知を送信（iOS Safari PWA対応強化版）
 */
export async function sendTestNotification(title: string, body: string, options: any = {}): Promise<boolean> {
  console.log('🧪 Starting test notification (iOS safe version)...');
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.error('❌ No service worker registration found');
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.error('❌ No push subscription available');
      return false;
    }

    console.log('📋 Converting subscription for test notification...');
    const subscriptionData = safeSubscriptionToJSON(subscription);
    
    if (!subscriptionData.endpoint) {
      console.error('❌ Invalid subscription data: missing endpoint');
      return false;
    }

    console.log('📤 Sending test notification request...');
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        title,
        body,
        options
      })
    });

    console.log('📥 Test notification response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Test notification request failed:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Test notification result:', result);
    
    return true;

  } catch (error) {
    console.error('❌ Test notification failed:', error);
    console.error('- Error name:', (error as Error).name);
    console.error('- Error message:', (error as Error).message);
    
    // iOS特有のエラー分析
    if (isiOSSafariPWA() && (error as Error).message.includes('SyntaxError')) {
      console.error('🚨 Detected iOS Safari PWA subscription bug');
    }
    
    return false;
  }
}

/**
 * スケジュール通知を設定（iOS Safari PWA対応強化版）
 */
export async function scheduleNotifications(settings: {
  morning: string;
  afternoon: string;
  evening: string;
}): Promise<boolean> {
  console.log('📅 Starting schedule notifications setup (iOS safe version)...');
  
  try {
    const subscription = await getActiveSubscription();
    if (!subscription) {
      console.error('❌ No active subscription found');
      return false;
    }

    console.log('📋 Converting subscription for schedule setup...');
    const subscriptionData = safeSubscriptionToJSON(subscription);
    
    if (!subscriptionData.endpoint) {
      console.error('❌ Invalid subscription data: missing endpoint');
      return false;
    }

    console.log('📤 Sending schedule notifications request...');
    const response = await fetch('/api/schedule-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        schedule: settings
      })
    });

    console.log('📥 Schedule notifications response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Schedule notifications request failed:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Schedule notifications result:', result);
    
    return true;

  } catch (error) {
    console.error('❌ Schedule notifications failed:', error);
    console.error('- Error name:', (error as Error).name);
    console.error('- Error message:', (error as Error).message);
    
    // iOS特有のエラー分析
    if (isiOSSafariPWA() && (error as Error).message.includes('SyntaxError')) {
      console.error('🚨 Detected iOS Safari PWA subscription bug');
    }
    
    return false;
  }
}

/**
 * プッシュ通知の権限状態を取得
 */
export function getPushPermissionState(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * 現在の購読状態を取得
 */
export async function getActiveSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return null;
  }
}

/**
 * iOS Safari PWA対応: 安全なサブスクリプション変換
 * subscription.toJSON()がSyntaxErrorを投げる場合の回避策
 */
function safeSubscriptionToJSON(subscription: PushSubscription): any {
  console.log('🔄 Converting subscription to JSON (iOS safe version)...');
  
  try {
    // 標準的な変換を試行
    const jsonData = subscription.toJSON();
    console.log('✅ Standard toJSON() conversion successful');
    return jsonData;
  } catch (error) {
    console.warn('⚠️ Standard toJSON() failed, using manual conversion:', error);
    
    // iOS Safari PWA バグ回避: 手動でオブジェクトを構築
    try {
      const manualData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') 
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
            : '',
          auth: subscription.getKey('auth') 
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            : ''
        }
      };
      
      console.log('🔧 Manual subscription object constructed successfully');
      console.log('- Endpoint length:', manualData.endpoint.length);
      console.log('- p256dh key available:', !!manualData.keys.p256dh);
      console.log('- auth key available:', !!manualData.keys.auth);
      
      return manualData;
    } catch (manualError) {
      console.error('❌ Manual subscription conversion also failed:', manualError);
      
      // 最後の手段: 基本的な情報のみ
      const fallbackData = {
        endpoint: subscription.endpoint || '',
        keys: {
          p256dh: '',
          auth: ''
        }
      };
      
      console.warn('🚨 Using fallback subscription data (keys may be missing)');
      return fallbackData;
    }
  }
}

/**
 * VAPID公開鍵をUint8Arrayに変換
 */
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

/**
 * サーバーに購読情報を保存（iOS Safari PWA対応強化版）
 */
async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  console.log('💾 Saving subscription to server (iOS safe version)...');
  
  try {
    const subscriptionData = safeSubscriptionToJSON(subscription);
    
    if (!subscriptionData.endpoint) {
      throw new Error('Invalid subscription data: missing endpoint');
    }

    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save subscription to server: ${errorText}`);
    }

    console.log('✅ Subscription saved to server successfully');
  } catch (error) {
    console.error('❌ Failed to save subscription:', error);
    
    // iOS特有のエラー分析
    if (isiOSSafariPWA() && (error as Error).message.includes('SyntaxError')) {
      console.error('🚨 Detected iOS Safari PWA subscription bug in save operation');
    }
    
    throw error; // Re-throw to maintain error handling chain
  }
}

/**
 * サーバーから購読情報を削除（iOS Safari PWA対応強化版）
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  console.log('🗑️ Removing subscription from server (iOS safe version)...');
  
  try {
    const subscriptionData = safeSubscriptionToJSON(subscription);
    
    if (!subscriptionData.endpoint) {
      throw new Error('Invalid subscription data: missing endpoint');
    }

    const response = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to remove subscription from server: ${errorText}`);
    }

    console.log('✅ Subscription removed from server successfully');
  } catch (error) {
    console.error('❌ Failed to remove subscription:', error);
    
    // iOS特有のエラー分析
    if (isiOSSafariPWA() && (error as Error).message.includes('SyntaxError')) {
      console.error('🚨 Detected iOS Safari PWA subscription bug in remove operation');
    }
    
    // Note: Don't re-throw for removal operations to avoid breaking unsubscribe flow
  }
}