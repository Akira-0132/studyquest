// Web Push APIによる本格的なプッシュ通知管理

// プッシュ通知の購読を開始
export async function subscribeToPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications are not supported');
    return false;
  }

  try {
    // Service Workerが準備できるまで待つ
    const registration = await navigator.serviceWorker.ready;
    
    // 既存のサブスクリプションをチェック
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // VAPIDキーなしでローカルプッシュとして購読
      // 注: 本番環境では実際のVAPIDキーを使用すべき
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
      });
      
      console.log('Push subscription created:', subscription);
    }
    
    // サブスクリプションをローカルストレージに保存
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    
    // Periodic Background Syncを登録（利用可能な場合）
    if ('periodicSync' in registration) {
      try {
        await (registration as any).periodicSync.register('check-notifications', {
          minInterval: 60 * 60 * 1000 // 1時間ごと
        });
        console.log('Periodic background sync registered');
      } catch (error) {
        console.log('Periodic background sync not available:', error);
      }
    }
    
    // Background Syncを登録
    if ('sync' in registration) {
      try {
        await (registration as any).sync.register('send-notification');
        console.log('Background sync registered');
      } catch (error) {
        console.log('Background sync registration failed:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

// Base64 URLをUint8Arrayに変換（VAPIDキー用）
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 通知設定をService Workerと同期
export async function syncNotificationSettings() {
  const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
  
  if (!settings.enabled) return;
  
  // IndexedDBに設定を保存（Service Workerからアクセス可能）
  if ('indexedDB' in window) {
    try {
      const db = await openNotificationDB();
      const tx = db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      
      await store.put({
        id: 'notification-times',
        morning: settings.morning || '07:00',
        afternoon: settings.afternoon || '16:00',
        evening: settings.evening || '20:00',
        enabled: settings.enabled
      });
      
      await tx.complete;
      console.log('Notification settings synced to IndexedDB');
    } catch (error) {
      console.error('Failed to sync settings:', error);
    }
  }
}

// IndexedDBを開く
async function openNotificationDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StudyQuestDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('scheduledNotifications')) {
        const store = db.createObjectStore('scheduledNotifications', { keyPath: 'id' });
        store.createIndex('time', 'time', { unique: false });
      }
    };
  });
}

// 定期通知をスケジュール（Service Worker経由）
export async function scheduleNotifications() {
  const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
  
  if (!settings.enabled) {
    console.log('Notifications are disabled');
    return;
  }
  
  try {
    // Service Workerが準備できるまで待つ
    const registration = await navigator.serviceWorker.ready;
    
    // Push購読を確認/作成
    await subscribeToPushNotifications();
    
    // 設定をIndexedDBに同期
    await syncNotificationSettings();
    
    // Service Workerにメッセージを送信
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        settings: settings
      });
    }
    
    console.log('Notifications scheduled successfully');
  } catch (error) {
    console.error('Failed to schedule notifications:', error);
  }
}

// テスト通知を送信
export async function sendTestNotification(message?: string) {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Service Workerにテスト通知を要求
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        message: message || '🎉 通知テストが成功しました！'
      });
      return true;
    } else {
      // コントローラーがない場合は直接表示
      await registration.showNotification('StudyQuest', {
        body: message || '🎉 通知テストが成功しました！',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification'
      });
      return true;
    }
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
}

// 通知権限を確認・要求
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }
  
  let permission = Notification.permission;
  
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  
  if (permission === 'granted') {
    // Push購読を開始
    await subscribeToPushNotifications();
    // 設定を同期
    await syncNotificationSettings();
  }
  
  return permission;
}

// Service Workerを更新
export async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('Service Worker updated');
  }
}