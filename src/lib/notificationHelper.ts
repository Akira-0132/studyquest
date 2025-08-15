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

// 定期通知のスケジューリング（テスト用の即座実行機能付き）
export async function scheduleLocalNotifications(testMode: boolean = false) {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') {
    console.log('通知機能が利用できません');
    return;
  }

  const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
  
  if (!settings.enabled && !testMode) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('Service Workerが登録されていません');
      return;
    }

    const now = new Date();
    const messages = [
      { time: settings.morning || '07:00', message: 'おはよう！今日も頑張ろう！🌅' },
      { time: settings.afternoon || '16:00', message: '学校お疲れさま！勉強始めよう📚' },
      { time: settings.evening || '20:00', message: 'ラストスパート！もう少し！💪' },
    ];

    // テストモードの場合、すぐに最初の通知を送信
    if (testMode) {
      try {
        await registration.showNotification('StudyQuest', {
          body: '📱 定期通知のテストです。指定時刻になると通知が届きます。',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'studyquest-test',
          requireInteraction: false,
        } as any);
        console.log('テスト通知を送信しました');
      } catch (error) {
        console.error('テスト通知の送信に失敗:', error);
      }
      return;
    }

    // 通常のスケジューリング
    messages.forEach(({ time, message }) => {
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
        setTimeout(async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.showNotification('StudyQuest', {
                body: message,
                icon: '/icon-192x192.png',
                badge: '/icon-96x96.png',
                tag: 'studyquest-scheduled',
                requireInteraction: false,
              } as any);
              console.log(`定期通知を送信しました: ${message}`);
            }
          } catch (error) {
            console.error('定期通知の送信に失敗:', error);
          }
        }, delay);
      }
    });
    
    console.log('定期通知のスケジューリングが完了しました');
  } catch (error) {
    console.error('定期通知のスケジューリングに失敗:', error);
  }
}

// 1分後に通知を送信するテスト機能
export async function testScheduledNotification() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') {
    alert('通知機能が利用できません');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      alert('Service Workerが登録されていません');
      return false;
    }

    // 1分後に通知
    const delay = 60 * 1000; // 60秒
    console.log('1分後に通知を送信します');
    
    setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification('StudyQuest', {
            body: '⏰ 1分後の定期通知テストです！',
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            tag: 'studyquest-1min-test',
            requireInteraction: true,
          } as any);
          console.log('1分後のテスト通知を送信しました');
        }
      } catch (error) {
        console.error('1分後のテスト通知の送信に失敗:', error);
      }
    }, delay);
    
    return true;
  } catch (error) {
    console.error('テスト通知のスケジューリングに失敗:', error);
    alert(`エラー: ${error}`);
    return false;
  }
}

// Service Worker経由の通知テスト
export async function testServiceWorkerNotification() {
  if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Service Worker経由で通知を送信中...');
        await registration.showNotification('StudyQuest SW通知', {
          body: '🔧 Service Worker経由のテスト通知です',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'sw-test-notification',
          requireInteraction: true,
          vibrate: [200, 100, 200],
        } as any);
        console.log('Service Worker通知が送信されました');
        return true;
      } else {
        alert('Service Workerが登録されていません');
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