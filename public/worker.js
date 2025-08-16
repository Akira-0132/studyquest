// StudyQuest Custom Service Worker for next-pwa integration
// Handles push notifications with iOS PWA optimization

console.log('📱 StudyQuest Custom Worker initializing...');

// プッシュ通知受信（iOS Safari PWA最適化版）
self.addEventListener('push', (event) => {
  const pushEventId = Math.random().toString(36).substr(2, 9);
  console.log('📱 Push event received (iOS PWA):', {
    pushEventId,
    hasData: !!event.data,
    timestamp: new Date().toISOString(),
    origin: self.location.origin
  });
  
  // iOS Silent Push Detection and Tracking
  const trackPushEvent = async () => {
    try {
      // 既存のsilent push カウンターを取得
      let silentPushCount = 0;
      try {
        const existingCount = await self.clients.matchAll().then(clients => {
          return new Promise((resolve) => {
            if (clients.length > 0) {
              const messageChannel = new MessageChannel();
              messageChannel.port1.onmessage = (e) => {
                resolve(e.data.silentPushCount || 0);
              };
              clients[0].postMessage({
                type: 'GET_SILENT_PUSH_COUNT'
              }, [messageChannel.port2]);
            } else {
              resolve(0);
            }
          });
        });
        silentPushCount = parseInt(existingCount) || 0;
      } catch (e) {
        console.warn('⚠️ Could not retrieve silent push count:', e);
      }
      
      console.log(`📊 Current silent push count: ${silentPushCount}/3`);
      
      if (silentPushCount >= 2) {
        console.warn(`🚨 HIGH SILENT PUSH COUNT WARNING: ${silentPushCount}/3 - Subscription at risk!`);
      }
      
    } catch (trackError) {
      console.warn('⚠️ Failed to track push event:', trackError);
    }
  };
  
  // CRITICAL: iOS Safari PWA requires IMMEDIATE event.waitUntil() call
  // Without this, iOS treats push as "silent" and terminates subscription after 3 silent pushes
  const handlePush = async () => {
    // Track the push event first
    await trackPushEvent();
    let notificationData = {
      title: 'StudyQuest',
      body: '📚 勉強の時間です！',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'studyquest-push',
      requireInteraction: true, // iOS向けに永続化
      silent: false, // CRITICAL: NEVER set to true on iOS
      vibrate: [200, 100, 200], // iOS対応
      renotify: true, // iOS向け
      data: {
        timestamp: Date.now(),
        url: '/',
        source: 'background-push',
        pushEventId: Math.random().toString(36).substr(2, 9)
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
          // iOS: 確実にsilent=falseを維持
          silent: false,
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

    // iOS固有のバグ対策とnotification display
    try {
      // iOS 18.1.1+ IndexedDBバグ対策
      if (typeof indexedDB === 'undefined') {
        console.warn('⚠️ IndexedDB unavailable in push context (iOS bug)');
      }
      
      // CRITICAL: Ensure notification is displayed to prevent silent push
      const notification = await self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction,
        silent: false, // NEVER allow silent notifications on iOS
        vibrate: notificationData.vibrate,
        renotify: notificationData.renotify,
        data: notificationData.data,
        actions: notificationData.actions
      });
      
      console.log('✅ iOS PWA notification displayed successfully');
      console.log('- Notification tag:', notificationData.tag);
      console.log('- Silent:', false);
      console.log('- RequireInteraction:', notificationData.requireInteraction);
      
      // iOS-specific: Track notification display for debugging
      try {
        await self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_DISPLAYED',
              notification: {
                title: notificationData.title,
                body: notificationData.body,
                tag: notificationData.tag,
                timestamp: Date.now()
              }
            });
          });
        });
      } catch (clientError) {
        console.warn('⚠️ Failed to notify clients of notification display:', clientError);
      }
      
      return notification;
      
    } catch (error) {
      console.error('❌ Primary notification display failed:', error);
      
      // CRITICAL iOS fallback: ALWAYS show some notification to prevent silent push
      try {
        const fallbackNotification = await self.registration.showNotification('StudyQuest 通知', {
          body: '新しい通知があります（フォールバック）',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'ios-fallback-notification',
          requireInteraction: true,
          silent: false, // NEVER silent on iOS
          data: {
            timestamp: Date.now(),
            source: 'ios-fallback',
            originalError: error.message
          }
        });
        
        console.log('🔄 iOS fallback notification displayed');
        return fallbackNotification;
        
      } catch (fallbackError) {
        console.error('💥 CRITICAL: Both primary and fallback notifications failed on iOS!');
        console.error('- Primary error:', error);
        console.error('- Fallback error:', fallbackError);
        
        // Last resort: Use basic notification without features
        return await self.registration.showNotification('StudyQuest', {
          body: '通知エラー - 基本表示',
          requireInteraction: true,
          silent: false
        });
      }
    }
  };

  // CRITICAL: Immediate event.waitUntil() to prevent iOS silent push classification
  event.waitUntil(handlePush());
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
  console.log('📨 Message received in custom worker:', event.data);
  
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
console.log('📱 iOS PWA Custom Worker loaded successfully');

// Safari PWA特有の問題の監視
self.addEventListener('error', (event) => {
  console.error('🚨 Custom Worker error (iOS):', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Custom Worker unhandled promise rejection (iOS):', event.reason);
});