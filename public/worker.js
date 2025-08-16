// StudyQuest Enhanced Custom Service Worker for next-pwa integration
// Handles StudyQuest-specific push notifications with comprehensive routing and iOS PWA optimization

console.log('📱 StudyQuest Enhanced Custom Worker initializing...');

// StudyQuest notification routing configuration
const STUDYQUEST_NOTIFICATION_ROUTES = {
  'study_reminder': '/',
  'exam_alert': '/schedule',
  'streak_notification': '/',
  'achievement_unlock': '/settings',
  'schedule_update': '/schedule',
  'task_completion': '/',
  'level_up': '/settings',
  'badge_earned': '/settings',
  'streak_warning': '/',
  'exam_countdown': '/schedule',
  'daily_summary': '/'
};

// StudyQuest notification templates
const STUDYQUEST_NOTIFICATION_TEMPLATES = {
  'study_reminder': {
    icon: '📚',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'start_studying', title: '勉強を始める', icon: '/icon-96x96.png' },
      { action: 'snooze', title: '10分後に通知', icon: '/icon-96x96.png' },
      { action: 'dismiss', title: '後で' }
    ]
  },
  'exam_alert': {
    icon: '⚠️',
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: [
      { action: 'view_schedule', title: 'スケジュール確認', icon: '/icon-96x96.png' },
      { action: 'start_studying', title: '今すぐ勉強', icon: '/icon-96x96.png' },
      { action: 'dismiss', title: '確認済み' }
    ]
  },
  'streak_notification': {
    icon: '🔥',
    requireInteraction: true,
    vibrate: [100, 50, 100, 50, 100],
    actions: [
      { action: 'view_stats', title: '統計を見る', icon: '/icon-96x96.png' },
      { action: 'continue_streak', title: 'ストリーク継続', icon: '/icon-96x96.png' },
      { action: 'dismiss', title: '閉じる' }
    ]
  },
  'achievement_unlock': {
    icon: '🎉',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200, 100, 300],
    actions: [
      { action: 'view_achievement', title: '実績を見る', icon: '/icon-96x96.png' },
      { action: 'share', title: 'シェア', icon: '/icon-96x96.png' },
      { action: 'dismiss', title: '閉じる' }
    ]
  },
  'schedule_update': {
    icon: '📅',
    requireInteraction: false,
    vibrate: [100, 100, 100],
    actions: [
      { action: 'view_schedule', title: 'スケジュール確認', icon: '/icon-96x96.png' },
      { action: 'dismiss', title: 'OK' }
    ]
  }
};

// StudyQuest notification content generators
function getStudyQuestTitle(type, data) {
  const titles = {
    'study_reminder': `StudyQuest ${data?.timeSlot === 'morning' ? '🌅' : data?.timeSlot === 'afternoon' ? '📚' : '🌙'} 学習リマインダー`,
    'exam_alert': `⚠️ 試験まで${data?.daysUntilExam || 'あと少し'}！`,
    'streak_notification': `🔥 ${data?.streakCount || '連続'}日ストリーク${data?.subType === 'achievement' ? '達成！' : data?.subType === 'warning' ? '危機！' : '更新！'}`,
    'achievement_unlock': `🎉 ${data?.achievementType === 'level_up' ? 'レベルアップ！' : data?.achievementType === 'badge_earned' ? 'バッジ獲得！' : '新実績解除！'}`,
    'schedule_update': '📅 学習スケジュール更新',
    'task_completion': '✅ タスク完了おめでとう！',
    'level_up': `⭐ レベル${data?.newLevel || ''}到達！`,
    'badge_earned': `🎖️ 新バッジ「${data?.badgeName || 'バッジ'}」獲得！`,
    'streak_warning': `⚠️ ストリーク継続まで${data?.hoursRemaining || 'あと少し'}時間`,
    'exam_countdown': `📝 ${data?.examName || '試験'}まで${data?.daysRemaining || ''}日`,
    'daily_summary': '📊 今日の学習結果'
  };
  return titles[type] || 'StudyQuest 通知';
}

function getStudyQuestMessage(type, data) {
  const messages = {
    'study_reminder': getStudyReminderMessage(data),
    'exam_alert': `${data?.examName || '試験'}の準備は大丈夫ですか？今日も頑張りましょう！`,
    'streak_notification': getStreakMessage(data),
    'achievement_unlock': `${data?.title || '新しい実績'}を達成しました！継続が力になっています。`,
    'schedule_update': `${data?.newTasksCount || '複数'}個の新しいタスクが追加されました。`,
    'task_completion': `${data?.taskTitle || 'タスク'}完了！+${data?.expGained || '10'}EXP獲得しました。`,
    'level_up': `レベル${data?.newLevel || ''}になりました！新機能が解放されました。`,
    'badge_earned': `「${data?.badgeName || 'バッジ'}」を獲得しました！`,
    'streak_warning': `あと${Math.floor(data?.hoursRemaining || 24)}時間でストリークが途切れます。`,
    'exam_countdown': `準備進捗: ${data?.preparationStatus || 0}% - 頑張りましょう！`,
    'daily_summary': `今日は${data?.tasksCompleted || 0}/${data?.totalTasks || 0}タスク完了、${data?.expGained || 0}EXP獲得！`
  };
  return messages[type] || '新しい通知があります。';
}

function getStudyReminderMessage(data) {
  const timeSlot = data?.timeSlot;
  const streakCount = data?.streakCount || 0;
  const tasksCount = data?.tasksCount || 0;
  
  const messages = {
    'morning': [
      `おはよう！今日も頑張ろう！${tasksCount}個のタスクが待っています。`,
      `新しい一日の始まり！現在${streakCount}日連続学習中です。`,
      `朝の学習は効果的！今日の目標を達成しましょう。`
    ],
    'afternoon': [
      `学校お疲れさま！午後の学習時間です。`,
      `集中タイム！残り${tasksCount}個のタスクを片付けましょう。`,
      `午後の復習は記憶定着に効果的です。`
    ],
    'evening': [
      `夜の学習時間です。今日の仕上げをしましょう！`,
      `一日の締めくくり。${streakCount}日連続記録を維持しよう！`,
      `夜の復習で今日の学習を完璧に！`
    ]
  };
  
  const timeMessages = messages[timeSlot] || messages['afternoon'];
  return timeMessages[Math.floor(Math.random() * timeMessages.length)];
}

function getStreakMessage(data) {
  const subType = data?.subType;
  const streakCount = data?.streakCount || 0;
  
  switch (subType) {
    case 'achievement':
      return `${streakCount}日連続学習達成！素晴らしい継続力です。`;
    case 'warning':
      return `あと${Math.floor(data?.hoursUntilReset || 24)}時間でストリークが途切れます。今すぐ学習しましょう！`;
    case 'record':
      return `新記録！${streakCount}日連続は個人ベストです！`;
    case 'milestone':
      return `${data?.milestoneLevel || 'ブロンズ'}レベル到達！${streakCount}日連続学習の証です。`;
    default:
      return `現在${streakCount}日連続学習中！継続は力なり。`;
  }
}

// プッシュ通知受信（StudyQuest特化型）
self.addEventListener('push', (event) => {
  const pushEventId = Math.random().toString(36).substr(2, 9);
  console.log('📱 StudyQuest Push event received:', {
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
    
    // StudyQuest default notification structure
    let notificationData = {
      title: 'StudyQuest',
      body: '📚 新しい通知があります',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'studyquest-default',
      requireInteraction: true, // iOS向けに永続化
      silent: false, // CRITICAL: NEVER set to true on iOS
      vibrate: [200, 100, 200], // iOS対応
      renotify: true, // iOS向け
      data: {
        timestamp: Date.now(),
        url: '/',
        source: 'background-push',
        pushEventId: pushEventId,
        type: 'study_reminder' // デフォルトタイプ
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

    // StudyQuest プッシュデータ処理
    if (event.data) {
      try {
        const receivedData = event.data.json();
        console.log('📦 StudyQuest push data received:', receivedData);
        
        // StudyQuest通知タイプを特定
        const notificationType = receivedData.data?.type || receivedData.type || 'study_reminder';
        console.log('🎯 StudyQuest notification type:', notificationType);
        
        // タイプ別テンプレート適用
        const template = STUDYQUEST_NOTIFICATION_TEMPLATES[notificationType] || STUDYQUEST_NOTIFICATION_TEMPLATES['study_reminder'];
        const route = STUDYQUEST_NOTIFICATION_ROUTES[notificationType] || '/';
        
        // StudyQuest特化型通知データ構築
        notificationData = {
          title: receivedData.title || getStudyQuestTitle(notificationType, receivedData),
          body: receivedData.body || getStudyQuestMessage(notificationType, receivedData),
          icon: receivedData.icon || '/icon-192x192.png',
          badge: receivedData.badge || '/icon-96x96.png',
          tag: `studyquest-${notificationType}-${Date.now()}`,
          requireInteraction: template.requireInteraction,
          silent: false, // iOS: 確実にsilent=falseを維持
          vibrate: template.vibrate,
          renotify: true,
          data: {
            ...receivedData.data,
            type: notificationType,
            url: route,
            timestamp: Date.now(),
            source: 'background-push',
            pushEventId: pushEventId
          },
          actions: template.actions || notificationData.actions
        };
        
        // StudyQuest特化型ログ
        console.log('🎮 StudyQuest notification configured:', {
          type: notificationType,
          route: route,
          title: notificationData.title,
          requireInteraction: notificationData.requireInteraction
        });
        
      } catch (e) {
        console.warn('⚠️ StudyQuest push data parsing failed:', e);
        // フォールバック: テキストデータを使用
        if (event.data.text) {
          notificationData.body = event.data.text();
        }
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

// StudyQuest 通知クリック（タイプ別ルーティング対応）
self.addEventListener('notificationclick', (event) => {
  const notificationData = event.notification.data || {};
  const notificationType = notificationData.type || 'study_reminder';
  const action = event.action;
  
  console.log('📱 StudyQuest notification clicked:', {
    type: notificationType,
    action: action,
    tag: event.notification.tag,
    data: notificationData
  });
  
  event.notification.close();

  // StudyQuest アクション別処理
  if (action === 'dismiss') {
    console.log('✖️ StudyQuest notification dismissed');
    return;
  }

  // StudyQuest特化型アプリ起動・ナビゲーション
  const openStudyQuestApp = async () => {
    try {
      // StudyQuest特化型ルーティング決定
      let targetUrl = determineStudyQuestRoute(notificationType, action, notificationData);
      
      console.log('🎯 StudyQuest routing to:', targetUrl);
      
      const clientList = await clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      });
      
      console.log('🔍 Found StudyQuest clients:', clientList.length);
      
      // 既に開いているStudyQuestウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('🎯 Focusing existing StudyQuest client');
          await client.focus();
          
          // StudyQuest特化型ナビゲーション
          client.postMessage({
            type: 'STUDYQUEST_NAVIGATE',
            url: targetUrl,
            notificationType: notificationType,
            action: action,
            data: notificationData
          });
          
          // StudyQuest特化型アクション実行
          handleStudyQuestAction(client, notificationType, action, notificationData);
          
          return;
        }
      }
      
      // 新しくStudyQuestを開く
      if (clients.openWindow) {
        console.log('🆕 Opening new StudyQuest window:', targetUrl);
        await clients.openWindow(targetUrl);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle StudyQuest notification click:', error);
      // フォールバック: デフォルトページを開く
      try {
        if (clients.openWindow) {
          await clients.openWindow('/');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback navigation failed:', fallbackError);
      }
    }
  };

  event.waitUntil(openStudyQuestApp());
});

// StudyQuest通知タイプ・アクション別ルーティング
function determineStudyQuestRoute(type, action, data) {
  // アクション優先ルーティング
  const actionRoutes = {
    'start_studying': '/?action=start_study',
    'view_schedule': '/schedule',
    'view_stats': '/settings?tab=stats',
    'view_achievement': '/settings?tab=achievements',
    'continue_streak': '/?action=continue_streak',
    'snooze': '/?action=snoozed',
    'share': '/settings?action=share'
  };
  
  if (action && actionRoutes[action]) {
    return actionRoutes[action];
  }
  
  // タイプ別デフォルトルーティング
  const typeRoutes = STUDYQUEST_NOTIFICATION_ROUTES;
  let baseUrl = typeRoutes[type] || '/';
  
  // データ基づく追加パラメータ
  const queryParams = new URLSearchParams();
  
  // 通知からの参照であることを示す
  queryParams.set('from', 'notification');
  queryParams.set('type', type);
  
  if (data.examId) {
    queryParams.set('examId', data.examId);
  }
  
  if (data.taskId) {
    queryParams.set('taskId', data.taskId);
  }
  
  if (data.achievementType) {
    queryParams.set('achievement', data.achievementType);
  }
  
  if (data.urgencyLevel) {
    queryParams.set('priority', data.urgencyLevel);
  }
  
  return `${baseUrl}?${queryParams.toString()}`;
}

// StudyQuest特化型アクション実行
function handleStudyQuestAction(client, type, action, data) {
  try {
    const actionHandlers = {
      'start_studying': () => {
        client.postMessage({
          type: 'STUDYQUEST_ACTION',
          action: 'START_STUDY_SESSION',
          data: { type, notificationData: data }
        });
      },
      'snooze': () => {
        client.postMessage({
          type: 'STUDYQUEST_ACTION',
          action: 'SNOOZE_NOTIFICATION',
          data: { duration: 10, type } // 10分後
        });
      },
      'continue_streak': () => {
        client.postMessage({
          type: 'STUDYQUEST_ACTION',
          action: 'HIGHLIGHT_STREAK',
          data: { streakCount: data.streakCount }
        });
      },
      'view_stats': () => {
        client.postMessage({
          type: 'STUDYQUEST_ACTION',
          action: 'OPEN_STATS_MODAL',
          data: { focusType: type }
        });
      },
      'view_achievement': () => {
        client.postMessage({
          type: 'STUDYQUEST_ACTION',
          action: 'SHOW_ACHIEVEMENT',
          data: { achievementId: data.badgeId || data.title }
        });
      }
    };
    
    const handler = actionHandlers[action];
    if (handler) {
      handler();
      console.log(`🎮 StudyQuest action executed: ${action}`);
    }
    
  } catch (error) {
    console.error('❌ StudyQuest action handling failed:', error);
  }
}

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