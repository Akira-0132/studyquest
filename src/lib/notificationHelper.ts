// Service Workerにメッセージを送信
async function sendMessageToSW(message: any) {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message);
      return true;
    }
  }
  return false;
}

// MVP版の通知ヘルパー関数
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

    // 3秒後に自動で閉じる
    setTimeout(() => {
      notification.close();
    }, 3000);

    // クリック時にアプリを開く
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
}

// 定期通知のスケジューリング（Service Worker経由）
export async function scheduleLocalNotifications(testMode: boolean = false) {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') {
    console.log('通知機能が利用できません');
    return;
  }

  const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
  
  if (!settings.enabled && !testMode) return;

  try {
    // 既存のタイマーをクリア
    await sendMessageToSW({ type: 'CLEAR_NOTIFICATIONS' });

    // テストモードの場合、すぐにテスト通知を送信
    if (testMode) {
      const success = await sendMessageToSW({
        type: 'NOTIFICATION_TEST',
        message: '📱 定期通知のテストです。指定時刻になると通知が届きます。'
      });
      console.log('テスト通知を送信しました:', success);
      return;
    }

    const now = new Date();
    const messages = [
      { time: settings.morning || '07:00', message: 'おはよう！今日も頑張ろう！🌅' },
      { time: settings.afternoon || '16:00', message: '学校お疲れさま！勉強始めよう📚' },
      { time: settings.evening || '20:00', message: 'ラストスパート！もう少し！💪' },
    ];

    // 各通知をService Workerにスケジュール
    for (const { time, message } of messages) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // 今日の時刻が過ぎていれば明日にスケジュール
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      const delay = scheduledTime.getTime() - now.getTime();
      console.log(`通知をスケジュール: ${time} - ${message} (${Math.floor(delay / 1000 / 60)}分後)`);
      
      // 24時間以内のもののみスケジュール
      if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
        await sendMessageToSW({
          type: 'SCHEDULE_NOTIFICATION',
          delay: delay,
          message: message
        });
      }
    }
    
    console.log('定期通知のスケジューリングが完了しました');
  } catch (error) {
    console.error('定期通知のスケジューリングに失敗:', error);
  }
}

// 1分後に通知を送信するテスト機能（Service Worker経由）
export async function testScheduledNotification() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') {
    alert('通知機能が利用できません');
    return false;
  }

  try {
    const delay = 60 * 1000; // 60秒
    console.log('1分後に通知を送信します');
    
    const success = await sendMessageToSW({
      type: 'SCHEDULE_NOTIFICATION',
      delay: delay,
      message: '⏰ 1分後の定期通知テストです！バックグラウンドでも届きます。'
    });
    
    if (success) {
      console.log('1分後のテスト通知をスケジュールしました');
    }
    
    return success;
  } catch (error) {
    console.error('テスト通知のスケジューリングに失敗:', error);
    alert(`エラー: ${error}`);
    return false;
  }
}

// Service Worker経由の通知テスト（即座）
export async function testServiceWorkerNotification() {
  if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const success = await sendMessageToSW({
        type: 'NOTIFICATION_TEST',
        message: '🔧 Service Worker経由のテスト通知です'
      });
      
      if (success) {
        console.log('Service Worker通知が送信されました');
        return true;
      } else {
        alert('Service Workerが利用できません');
        return false;
      }
    } catch (error) {
      console.error('Service Worker通知エラー:', error);
      alert(`Service Worker通知エラー: ${error}`);
      return false;
    }
  } else {
    alert('Service Worker または通知がサポートされていません');
    return false;
  }
}