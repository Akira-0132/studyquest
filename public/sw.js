const CACHE_NAME = 'studyquest-v3';
const urlsToCache = [
  '/',
  '/schedule',
  '/exam/new',
  '/settings',
  '/manifest.json',
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // 即座に有効化
});

// アクティベート時
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return clients.claim();
    })
  );
});

// フェッチ時
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// プッシュ通知受信（Web Push API）
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'StudyQuest',
    body: '📚 勉強の時間です！',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: 'studyquest-push',
    requireInteraction: false,
    silent: false,
    data: {}
  };

  // プッシュデータがある場合は解析
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      data: notificationData.data
    })
  );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // アプリを開く or フォーカス
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既に開いているウィンドウがあればフォーカス
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しく開く
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// メッセージリスナー（クライアントからの通信用）
self.addEventListener('message', async (event) => {
  console.log('Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    // テスト通知を即座に表示
    await self.registration.showNotification('StudyQuest テスト', {
      body: event.data.message || '🔔 通知テストです',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'test-notification',
      requireInteraction: false
    });
  } else if (event.data && event.data.type === 'CHECK_PERMISSION') {
    // 通知権限の状態を返す
    event.ports[0].postMessage({
      permission: self.Notification ? self.Notification.permission : 'default'
    });
  }
});

// 定期同期（Periodic Background Sync API - 実験的機能）
self.addEventListener('periodicsync', async (event) => {
  console.log('Periodic sync event:', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndSendScheduledNotifications());
  }
});

// スケジュールされた通知をチェックして送信
async function checkAndSendScheduledNotifications() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // IndexedDBまたはキャッシュから設定を取得（簡易版ではダミーデータ）
  const schedules = [
    { hour: 7, minute: 0, message: 'おはよう！今日も頑張ろう！🌅' },
    { hour: 16, minute: 0, message: '学校お疲れさま！勉強始めよう📚' },
    { hour: 20, minute: 0, message: 'ラストスパート！もう少し！💪' }
  ];
  
  for (const schedule of schedules) {
    if (schedule.hour === currentHour && Math.abs(schedule.minute - currentMinute) < 5) {
      await self.registration.showNotification('StudyQuest', {
        body: schedule.message,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: `scheduled-${schedule.hour}-${schedule.minute}`,
        requireInteraction: false
      });
    }
  }
}

// Background Sync API（オフライン時の再送信用）
self.addEventListener('sync', async (event) => {
  console.log('Sync event:', event.tag);
  
  if (event.tag === 'send-notification') {
    event.waitUntil(sendPendingNotifications());
  }
});

async function sendPendingNotifications() {
  // オフライン時に送信できなかった通知を送信
  console.log('Sending pending notifications...');
}