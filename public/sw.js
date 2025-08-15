const CACHE_NAME = 'studyquest-v2';
const urlsToCache = [
  '/',
  '/schedule',
  '/exam/new',
  '/settings',
  '/manifest.json',
];

// インストール時
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // 即座に有効化
});

// フェッチ時
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// メッセージリスナー（クライアントからの通知要求を受信）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NOTIFICATION_TEST') {
    // テスト通知を即座に送信
    self.registration.showNotification('StudyQuest', {
      body: event.data.message || '📱 Service Workerからのテスト通知です',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'studyquest-test',
      requireInteraction: false,
    });
  } else if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    // 定期通知のスケジュール
    const { delay, message } = event.data;
    
    // タイマーIDを保存（後でクリアできるように）
    if (!self.notificationTimers) {
      self.notificationTimers = [];
    }
    
    const timerId = setTimeout(() => {
      self.registration.showNotification('StudyQuest', {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'studyquest-scheduled',
        requireInteraction: false,
      });
    }, delay);
    
    self.notificationTimers.push(timerId);
  } else if (event.data && event.data.type === 'CLEAR_NOTIFICATIONS') {
    // 既存のタイマーをクリア
    if (self.notificationTimers) {
      self.notificationTimers.forEach(timerId => clearTimeout(timerId));
      self.notificationTimers = [];
    }
  }
});

// プッシュ通知受信（将来のサーバープッシュ用）
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const options = {
    body: event.data.text() || 'StudyQuestからの通知です',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: 'studyquest-notification',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('StudyQuest', options)
  );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // アプリを開く
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // 何もしない（通知を閉じるだけ）
  } else {
    // デフォルトアクション
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Service Worker起動時
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // 即座にクライアントを制御
});

// 定期的な同期（実験的機能）
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'studyquest-notification') {
    event.waitUntil(
      self.registration.showNotification('StudyQuest', {
        body: '📚 勉強の時間です！',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'studyquest-periodic',
      })
    );
  }
});