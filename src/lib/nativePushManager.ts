// ネイティブWeb Push API管理システム

// VAPIDキー（公開鍵）- 環境変数から読み込み
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BNJzD4KrHlIdNp5dxEhUosMWXNf_L6bI6Cn1FbKLtEqvw7wl2Gc8OQTF1g4j3Y7kQRFZXNp5dxEhUosMWXNf_L6bI6Cn1FbKL';

/**
 * Service Workerを登録（詳細デバッグ付き）
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  console.log('🔄 Service Worker registration starting...');
  
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker not supported in this browser');
    return null;
  }

  try {
    console.log('📋 Browser support check:');
    console.log('- serviceWorker:', 'serviceWorker' in navigator);
    console.log('- PushManager:', 'PushManager' in window);
    console.log('- Notification:', 'Notification' in window);
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('✅ Service Worker registered successfully');
    console.log('- Scope:', registration.scope);
    console.log('- Active:', !!registration.active);
    console.log('- Installing:', !!registration.installing);
    console.log('- Waiting:', !!registration.waiting);
    
    // Service Workerがアクティブになるまで待機
    if (!registration.active && (registration.installing || registration.waiting)) {
      console.log('⏳ Waiting for Service Worker to become active...');
      await new Promise((resolve) => {
        const checkState = () => {
          if (registration.active) {
            console.log('✅ Service Worker is now active');
            resolve(void 0);
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
    }
    
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    console.error('- Error message:', (error as Error).message);
    console.error('- Error stack:', (error as Error).stack);
    return null;
  }
}

/**
 * プッシュ通知の購読（徹底デバッグ版）
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  console.log('🔔 Starting push subscription process...');
  
  try {
    // Service Worker登録
    console.log('📋 Step 1: Service Worker registration');
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('❌ Cannot proceed without Service Worker');
      return null;
    }

    // PushManager対応チェック
    console.log('📋 Step 2: PushManager support check');
    if (!registration.pushManager) {
      console.error('❌ PushManager not supported');
      return null;
    }
    console.log('✅ PushManager is available');

    // 既存購読確認
    console.log('📋 Step 3: Checking existing subscription');
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('✅ Found existing push subscription');
      console.log('- Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      console.log('- Keys:', subscription.getKey ? 'Available' : 'Not available');
    } else {
      console.log('📝 No existing subscription found');
      
      // VAPIDキー確認
      console.log('📋 Step 4: VAPID key validation');
      console.log('- VAPID key length:', VAPID_PUBLIC_KEY.length);
      console.log('- VAPID key preview:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
      
      try {
        const vapidBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        console.log('✅ VAPID key converted successfully');
        console.log('- Converted length:', vapidBytes.length);
        console.log('- Expected length: 65 bytes');
        
        if (vapidBytes.length !== 65) {
          console.error('❌ Invalid VAPID key length. Expected 65 bytes, got:', vapidBytes.length);
          return null;
        }
      } catch (vapidError) {
        console.error('❌ VAPID key conversion failed:', vapidError);
        return null;
      }
      
      // 新規購読作成
      console.log('📋 Step 5: Creating new push subscription');
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
        });
        
        console.log('✅ Push subscription created successfully!');
        console.log('- Endpoint:', subscription.endpoint.substring(0, 50) + '...');
        console.log('- p256dh key length:', subscription.getKey('p256dh')?.byteLength);
        console.log('- auth key length:', subscription.getKey('auth')?.byteLength);
        
      } catch (subscribeError) {
        console.error('❌ Push subscription creation failed:', subscribeError);
        console.error('- Error name:', (subscribeError as Error).name);
        console.error('- Error message:', (subscribeError as Error).message);
        
        // iOS固有の制限チェック
        if ((subscribeError as Error).name === 'NotSupportedError') {
          console.error('💡 This might be an iOS Safari limitation');
          console.error('💡 Ensure the app is installed as PWA and permissions are granted');
        }
        
        return null;
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
 * テスト通知を送信
 */
export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.error('No push subscription available');
      return false;
    }

    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        title,
        body
      })
    });

    const result = await response.json();
    console.log('Test notification result:', result);
    
    return response.ok;

  } catch (error) {
    console.error('Test notification failed:', error);
    return false;
  }
}

/**
 * スケジュール通知を設定
 */
export async function scheduleNotifications(settings: {
  morning: string;
  afternoon: string;
  evening: string;
}): Promise<boolean> {
  try {
    const subscription = await getActiveSubscription();
    if (!subscription) return false;

    const response = await fetch('/api/schedule-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        schedule: settings
      })
    });

    const result = await response.json();
    console.log('Schedule notifications result:', result);
    
    return response.ok;

  } catch (error) {
    console.error('Schedule notifications failed:', error);
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
 * サーバーに購読情報を保存
 */
async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }

    console.log('✅ Subscription saved to server');
  } catch (error) {
    console.error('❌ Failed to save subscription:', error);
  }
}

/**
 * サーバーから購読情報を削除
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }

    console.log('✅ Subscription removed from server');
  } catch (error) {
    console.error('❌ Failed to remove subscription:', error);
  }
}