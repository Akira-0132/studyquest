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

export function scheduleLocalNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const settings = JSON.parse(localStorage.getItem('studyquest_notifications') || '{}');
  
  if (!settings.enabled) return;

  const now = new Date();
  const messages = [
    { time: settings.morning || '07:00', message: 'おはよう！今日も頑張ろう！🌅' },
    { time: settings.afternoon || '16:00', message: '学校お疲れさま！勉強始めよう📚' },
    { time: settings.evening || '20:00', message: 'ラストスパート！もう少し！💪' },
  ];

  messages.forEach(({ time, message }) => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // 今日の時刻が過ぎていれば明日にスケジュール
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const delay = scheduledTime.getTime() - now.getTime();
    
    // 24時間以内のもののみスケジュール
    if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification('StudyQuest', {
            body: message,
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            tag: 'studyquest-scheduled',
          } as any);
          
          setTimeout(() => {
            notification.close();
          }, 3000);
        }
      }, delay);
    }
  });
}

export function testNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    // より確実な通知実装
    try {
      const notification = new Notification('StudyQuest テスト通知', {
        body: '🎉 通知が正常に動作しています！この通知が見えれば成功です。',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification',
        requireInteraction: true, // ユーザーが操作するまで残る
      } as any);

      // クリック時の動作
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 10秒後に自動で閉じる
      setTimeout(() => {
        notification.close();
      }, 10000);

      console.log('テスト通知を送信しました');
      return notification;
    } catch (error) {
      console.error('テスト通知の送信に失敗:', error);
      alert(`通知送信エラー: ${error}`);
    }
  } else {
    alert('通知が許可されていません');
  }
  return null;
}