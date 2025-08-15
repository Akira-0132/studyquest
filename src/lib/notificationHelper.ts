import { 
  subscribeToPushNotifications, 
  syncNotificationSettings, 
  sendTestNotification as sendPushTestNotification,
  scheduleNotifications as schedulePushNotifications,
  requestNotificationPermission as requestPushPermission,
  updateServiceWorker
} from './pushNotificationManager';

// レガシー通知機能（後方互換性のため残す）
export function showLocalNotification(title: string, body: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notificationOptions: any = {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'studyquest',
      vibrate: [200, 100, 200],
      ...options,
    };
    
    const notification = new Notification(title, notificationOptions);
    
    setTimeout(() => {
      notification.close();
    }, 3000);
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
  return null;
}

// 定期通知のスケジューリング（Web Push API版）
export async function scheduleLocalNotifications(testMode: boolean = false) {
  console.log('Scheduling notifications...', { testMode });
  
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log('通知機能が利用できません');
    return;
  }
  
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    console.log('通知権限がありません:', permission);
    return;
  }
  
  try {
    // Service Workerを最新に更新
    await updateServiceWorker();
    
    if (testMode) {
      // テストモードの場合、即座にテスト通知を送信
      await sendPushTestNotification('📱 定期通知のテストです。設定した時刻に通知が届きます。');
      return;
    }
    
    // Push通知をスケジュール
    await schedulePushNotifications();
    
    console.log('通知のスケジューリングが完了しました');
  } catch (error) {
    console.error('通知のスケジューリングに失敗:', error);
  }
}

// 1分後に通知を送信するテスト機能
export async function testScheduledNotification() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    alert('通知機能が利用できません');
    return false;
  }
  
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    alert('通知権限がありません');
    return false;
  }
  
  try {
    // 1分後のテスト通知をスケジュール
    setTimeout(async () => {
      await sendPushTestNotification('⏰ 1分後の定期通知テストです！バックグラウンドでも届きます。');
    }, 60 * 1000);
    
    console.log('1分後のテスト通知をスケジュールしました');
    return true;
  } catch (error) {
    console.error('テスト通知のスケジューリングに失敗:', error);
    alert(`エラー: ${error}`);
    return false;
  }
}

// Service Worker経由の通知テスト
export async function testServiceWorkerNotification() {
  try {
    const success = await sendPushTestNotification('🔧 Service Worker経由のテスト通知です');
    
    if (success) {
      console.log('Service Worker通知が送信されました');
      return true;
    } else {
      alert('Service Worker通知の送信に失敗しました');
      return false;
    }
  } catch (error) {
    console.error('Service Worker通知エラー:', error);
    alert(`Service Worker通知エラー: ${error}`);
    return false;
  }
}