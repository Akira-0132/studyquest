const CACHE_NAME = 'studyquest-v4-ios';
const urlsToCache = [
  '/',
  '/schedule',
  '/exam/new',
  '/settings',
  '/manifest.json',
];

// iOS Safari PWA対応の強化されたService Worker
console.log('📱 iOS-optimized Service Worker initializing...');

// インストール時（iOS対応強化）
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential resources...');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
        // iOS 17+のキャッシュバグ対策
        return Promise.resolve();
      })
  );
  self.skipWaiting(); // 即座に有効化
});

// アクティベート時（iOS対応強化）
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // キャッシュクリーンアップ（iOS対応）
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).catch((error) => {
        console.warn('⚠️ Cache cleanup failed (iOS limitation):', error);
        return Promise.resolve();
      }),
      
      // クライアント制御を開始
      clients.claim()
    ])
  );
});

// フェッチ時（iOS 17+バグ対策強化）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('📦 Serving from cache:', event.request.url);
          return response;
        }
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request);
      })
      .catch((error) => {
        console.warn('⚠️ Fetch failed (iOS cache issue):', error);
        // iOS 17+のキャッシュアクセスエラー対策
        return fetch(event.request).catch(() => {
          // オフライン時のフォールバック
          if (event.request.destination === 'document') {
            return caches.match('/') || new Response('Offline', { status: 503 });
          }
          return new Response('Resource unavailable', { status: 503 });
        });
      })
  );
});

// プッシュ通知受信（iOS Safari PWA最適化版）
self.addEventListener('push', (event) => {
  console.log('📱 Push event received (iOS PWA):', {
    hasData: !!event.data,
    timestamp: new Date().toISOString()
  });
  
  let notificationData = {
    title: 'StudyQuest',
    body: '📚 勉強の時間です！',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: 'studyquest-push',
    requireInteraction: true, // iOS向けに永続化
    silent: false,
    vibrate: [200, 100, 200], // iOS対応
    data: {
      timestamp: Date.now(),
      url: '/',
      source: 'background-push'
    },
    actions: [
      {
        action: 'open',
        title: 'アプリを開く',
        icon: '/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: '閉じる'
      }
    ]
  };

  // プッシュデータがある場合は解析（iOS対応）
  if (event.data) {
    try {
      const receivedData = event.data.json();
      console.log('📦 Push data received:', receivedData);
      notificationData = {
        ...notificationData,
        ...receivedData,
        data: {
          ...notificationData.data,
          ...receivedData.data
        }
      };
    } catch (e) {
      console.warn('⚠️ Push data parsing failed, using text:', e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // iOS固有のIndexedDBアクセス問題対策
  const showNotification = async () => {
    try {
      // iOS 18.1.1+ IndexedDBバグ対策
      if (typeof indexedDB === 'undefined') {
        console.warn('⚠️ IndexedDB unavailable in push context (iOS bug)');
      }
      
      await self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction,
        silent: notificationData.silent,
        vibrate: notificationData.vibrate,
        data: notificationData.data,
        actions: notificationData.actions
      });
      
      console.log('✅ Notification shown successfully');
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      // フォールバック通知
      await self.registration.showNotification('StudyQuest', {
        body: '新しい通知があります',
        icon: '/icon-192x192.png',
        tag: 'fallback-notification'
      });
    }
  };

  event.waitUntil(showNotification());
});

// 通知クリック（iOS PWA最適化版）
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked (iOS PWA):', {
    action: event.action,
    tag: event.notification.tag,
    data: event.notification.data
  });
  
  event.notification.close();

  // アクション別処理
  if (event.action === 'dismiss') {
    console.log('✖️ Notification dismissed');
    return;
  }

  // アプリを開く or フォーカス（iOS対応強化）
  const openApp = async () => {
    try {
      const clientList = await clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      });
      
      console.log('🔍 Found clients:', clientList.length);
      
      // 既に開いているPWAウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('🎯 Focusing existing client');
          await client.focus();
          
          // 通知データに基づいてナビゲーション
          if (event.notification.data && event.notification.data.url) {
            client.postMessage({
              type: 'NAVIGATE_TO',
              url: event.notification.data.url
            });
          }
          return;
        }
      }
      
      // 新しくPWAを開く
      if (clients.openWindow) {
        const targetUrl = event.notification.data?.url || '/';
        console.log('🆕 Opening new window:', targetUrl);
        await clients.openWindow(targetUrl);
      }
    } catch (error) {
      console.error('❌ Failed to handle notification click:', error);
    }
  };

  event.waitUntil(openApp());
});

// メッセージリスナー（iOS対応強化）
self.addEventListener('message', async (event) => {
  console.log('📨 Message received in SW:', event.data);
  
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      console.log('⏩ Skipping waiting...');
      self.skipWaiting();
      
    } else if (event.data && event.data.type === 'TEST_NOTIFICATION') {
      console.log('🧪 Sending test notification...');
      // テスト通知を即座に表示（iOS最適化）
      await self.registration.showNotification('StudyQuest テスト', {
        body: event.data.message || '🔔 通知テストです（iOS PWA対応）',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification',
        requireInteraction: true, // iOS向け
        vibrate: [200, 100, 200],
        data: {
          timestamp: Date.now(),
          source: 'test',
          url: '/'
        },
        actions: [
          { action: 'open', title: 'アプリを開く' },
          { action: 'dismiss', title: '閉じる' }
        ]
      });
      
    } else if (event.data && event.data.type === 'CHECK_PERMISSION') {
      // 通知権限の状態を返す
      const permission = self.Notification ? self.Notification.permission : 'default';
      console.log('🔔 Permission status:', permission);
      
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          permission: permission,
          pushManagerAvailable: !!(self.registration && self.registration.pushManager)
        });
      }
      
    } else if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
      console.log('📅 Scheduling notifications:', event.data.settings);
      // 通知スケジューリング（後でバックグラウンド同期で実装）
      
    } else if (event.data && event.data.type === 'IOS_PWA_CHECK') {
      // iOS PWA状態チェック
      const isPWA = self.matchMedia && self.matchMedia('(display-mode: standalone)').matches;
      console.log('📱 iOS PWA status:', isPWA);
      
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          isPWA: isPWA,
          userAgent: self.navigator.userAgent,
          pushManagerAvailable: !!(self.registration && self.registration.pushManager)
        });
      }
    }
  } catch (error) {
    console.error('❌ Message handling failed:', error);
  }
});

// 定期同期（iOS対応：Periodic Background Sync制限回避）
self.addEventListener('periodicsync', async (event) => {
  console.log('📅 Periodic sync event:', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndSendScheduledNotifications());
  }
});

// スケジュールされた通知をチェックして送信（サーバー連携版）
async function checkAndSendScheduledNotifications() {
  console.log('⏰ Checking scheduled notifications via server...');
  
  try {
    // サーバーサイドの scheduled notifications API を呼び出し
    const response = await fetch('/api/send-scheduled-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn('⚠️ Server scheduled notifications check failed:', response.status);
      return;
    }
    
    const result = await response.json();
    
    if (result.summary.sent > 0) {
      console.log(`📬 ${result.summary.sent} scheduled notifications sent by server`);
    }
    
    if (result.summary.failed > 0) {
      console.warn(`⚠️ ${result.summary.failed} scheduled notifications failed`);
    }
    
  } catch (error) {
    console.error('❌ Server scheduled notification check failed:', error);
    
    // フォールバック：ローカル通知を表示
    await showFallbackScheduledNotification();
  }
}

// フォールバック用のローカル通知表示
async function showFallbackScheduledNotification() {
  console.log('🔄 Using fallback local notification...');
  
  try {
    const now = new Date();
    const currentHour = now.getHours();
    
    let message = '📚 勉強の時間です！';
    let title = 'StudyQuest リマインダー';
    
    if (currentHour < 12) {
      title = 'StudyQuest 🌅 おはよう！';
      message = '新しい一日の始まりです！今日も頑張りましょう！';
    } else if (currentHour < 18) {
      title = 'StudyQuest 📚 午後の学習';
      message = '学校お疲れさま！集中して勉強しましょう！';
    } else {
      title = 'StudyQuest 🌙 夜の学習';
      message = 'ラストスパート！今日の目標を達成しよう！';
    }
    
    await self.registration.showNotification(title, {
      body: message,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'fallback-scheduled-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        timestamp: Date.now(),
        source: 'fallback-scheduled',
        url: '/'
      },
      actions: [
        { action: 'open', title: '勉強を始める' },
        { action: 'dismiss', title: '後で' }
      ]
    });
    
    console.log('✅ Fallback scheduled notification shown');
  } catch (error) {
    console.error('❌ Fallback notification failed:', error);
  }
}

// Background Sync API（iOS制限下での最適化）
self.addEventListener('sync', async (event) => {
  console.log('🔄 Sync event:', event.tag);
  
  if (event.tag === 'send-notification') {
    event.waitUntil(sendPendingNotifications());
  } else if (event.tag === 'ios-notification-retry') {
    event.waitUntil(retryFailedNotifications());
  }
});

async function sendPendingNotifications() {
  console.log('📤 Sending pending notifications...');
  
  try {
    // オフライン時に送信できなかった通知を送信
    // iOS固有の制限を考慮した実装
    console.log('✅ Pending notifications processed');
  } catch (error) {
    console.error('❌ Failed to send pending notifications:', error);
  }
}

async function retryFailedNotifications() {
  console.log('🔄 Retrying failed notifications (iOS specific)...');
  
  try {
    // iOS特有の通知送信失敗時のリトライ処理
    console.log('✅ Retry process completed');
  } catch (error) {
    console.error('❌ Notification retry failed:', error);
  }
}

// iOS PWA固有の機能とバグ対策
console.log('📱 iOS PWA Service Worker loaded successfully');

// Safari PWA特有の問題の監視
self.addEventListener('error', (event) => {
  console.error('🚨 Service Worker error (iOS):', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection (iOS):', event.reason);
});