// スケジュール通知管理API
const webpush = require('web-push');

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// ファイルベースストレージをインポート
const { saveSubscriptionToEnv, getAllSubscriptions, saveSubscriptions } = require('./storage.js');

module.exports = async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      return await handleScheduleSet(req, res);
    } else if (req.method === 'GET') {
      return await handleScheduleCheck(req, res);
    } else if (req.method === 'DELETE') {
      return await handleScheduleRemove(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Schedule API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// スケジュール設定
async function handleScheduleSet(req, res) {
  const { subscription, schedule, userId } = req.body;

  if (!subscription || !schedule) {
    return res.status(400).json({ error: 'Subscription and schedule required' });
  }

  // ユーザーIDを生成（subscription endpointを基に）
  const userKey = userId || btoa(subscription.endpoint).substring(0, 20);

  // スケジュールをファイルに保存
  const userData = {
    subscription,
    schedule,
    createdAt: new Date(),
    lastNotified: {}
  };
  
  const saved = saveSubscriptionToEnv(userKey, userData);

  console.log(`📅 Schedule set for user ${userKey}:`, schedule);
  console.log('🔕 Test notification disabled to prevent immediate alerts');

  return res.status(200).json({
    success: true,
    message: 'Schedule set successfully',
    userKey,
    saved: saved
  });
}

// スケジュール通知チェック（定期実行用）
async function handleScheduleCheck(req, res) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toDateString();

  let sentCount = 0;
  const results = [];

  console.log(`⏰ Checking schedules at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

  // ファイルから全購読情報を読み込み
  const schedules = getAllSubscriptions();
  console.log(`📊 Loaded ${schedules.size} schedules for checking`);

  for (const [userKey, userData] of schedules.entries()) {
    const { subscription, schedule, lastNotified } = userData;

    // 各時間帯をチェック
    const timeSlots = [
      { key: 'morning', time: schedule.morning, message: '🌅 おはよう！今日も学習を頑張ろう！' },
      { key: 'afternoon', time: schedule.afternoon, message: '📚 午後の学習タイムです！' },
      { key: 'evening', time: schedule.evening, message: '🌙 今日の学習の仕上げをしよう！' }
    ];

    for (const slot of timeSlots) {
      if (!slot.time) continue;

      const [scheduleHour, scheduleMinute] = slot.time.split(':').map(Number);
      
      // 時刻が一致し、今日まだ送信していない場合
      if (scheduleHour === currentHour && 
          Math.abs(scheduleMinute - currentMinute) <= 2 && // 2分の誤差許容
          lastNotified[slot.key] !== today) {

        try {
          await sendScheduledNotification(subscription, slot.message, slot.key);
          
          // 送信記録を更新してファイルに保存
          userData.lastNotified[slot.key] = today;
          saveSubscriptionToEnv(userKey, userData);
          sentCount++;

          results.push({
            userKey,
            slot: slot.key,
            time: slot.time,
            status: 'sent'
          });

          console.log(`✅ Sent ${slot.key} notification to ${userKey}`);

        } catch (error) {
          console.error(`❌ Failed to send notification to ${userKey}:`, error);
          results.push({
            userKey,
            slot: slot.key,
            time: slot.time,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
  }

  return res.status(200).json({
    success: true,
    sentCount,
    totalUsers: schedules.size,
    results: results.slice(0, 10), // 最大10件の詳細結果
    currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`
  });
}

// スケジュール削除
async function handleScheduleRemove(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // ファイルから削除
  const schedules = getAllSubscriptions();
  const deleted = schedules.delete(userId);
  if (deleted) {
    // 変更をファイルに保存
    saveSubscriptions(schedules);
  }

  return res.status(200).json({
    success: true,
    deleted,
    message: deleted ? 'Schedule removed' : 'Schedule not found'
  });
}

// スケジュール通知送信
async function sendScheduledNotification(subscription, message, type) {
  const payload = JSON.stringify({
    title: 'StudyQuest 📚',
    body: message,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    data: {
      url: 'https://studyquest.vercel.app',
      type: `scheduled-${type}`,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/icon-192x192.png'
      }
    ],
    requireInteraction: true, // 重要：バックグラウンドでも表示
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    tag: `studyquest-${type}`
  });

  return await webpush.sendNotification(subscription, payload);
}

// テスト通知送信
async function sendTestScheduleNotification(subscription) {
  const payload = JSON.stringify({
    title: 'StudyQuest 🎉',
    body: 'スケジュール通知の設定が完了しました！バックグラウンドでも通知が届きます。',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    data: {
      url: 'https://studyquest.vercel.app',
      type: 'setup-complete',
      timestamp: Date.now()
    },
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
    tag: 'studyquest-setup'
  });

  return await webpush.sendNotification(subscription, payload);
}