const CACHE_NAME = 'studyquest-v1';
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

// プッシュ通知受信（MVP版では基本機能のみ）
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const options = {
    body: event.data.text() || 'StudyQuestからの通知です',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [100, 50, 100],
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

// 定期的な通知スケジュール
const scheduleNotifications = () => {
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
    
    setTimeout(() => {
      self.registration.showNotification('StudyQuest', {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        vibrate: [100, 50, 100],
      });
    }, delay);
  });
};

// Service Worker起動時に通知をスケジュール
self.addEventListener('activate', (event) => {
  scheduleNotifications();
});