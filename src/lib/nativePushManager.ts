// ネイティブWeb Push API管理システム

// VAPIDキー（公開鍵）- 環境変数から読み込み
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BNJzD4KrHlIdNp5dxEhUosMWXNf_L6bI6Cn1FbKLtEqvw7wl2Gc8OQTF1g4j3Y7kQRFZXNp5dxEhUosMWXNf_L6bI6Cn1FbKL';

/**
 * Service Workerを登録
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * プッシュ通知の購読
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    // 既存の購読を確認
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('🔔 Creating new push subscription...');
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });
      
      console.log('✅ Push subscription created:', subscription);
    } else {
      console.log('✅ Using existing push subscription:', subscription);
    }

    // サーバーに購読情報を保存
    await saveSubscriptionToServer(subscription);
    
    return subscription;

  } catch (error) {
    console.error('❌ Push subscription failed:', error);
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