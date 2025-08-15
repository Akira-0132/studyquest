// 手動でスケジュール通知をトリガー（テスト用）
const webpush = require('web-push');

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, timeType = 'morning' } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription required' });
    }

    // 時間帯に応じたメッセージを選択
    const messages = {
      morning: '🌅 おはよう！今日も学習を頑張ろう！',
      afternoon: '📚 午後の学習タイムです！',
      evening: '🌙 今日の学習の仕上げをしよう！',
      test: '🔔 スケジュール通知テストです。バックグラウンドでも届きます！'
    };

    const payload = JSON.stringify({
      title: 'StudyQuest 📚 スケジュール通知',
      body: messages[timeType] || messages.test,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      data: {
        url: 'https://studyquest.vercel.app',
        type: `scheduled-${timeType}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: '開く',
          icon: '/icon-192x192.png'
        },
        {
          action: 'snooze',
          title: 'スヌーズ',
          icon: '/icon-96x96.png'
        }
      ],
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      tag: `studyquest-scheduled-${timeType}`
    });

    console.log(`📮 Sending scheduled notification (${timeType}) to:`, subscription.endpoint.substring(0, 50) + '...');

    const result = await webpush.sendNotification(subscription, payload);

    console.log('✅ Scheduled notification sent successfully');

    return res.status(200).json({
      success: true,
      message: `Scheduled notification (${timeType}) sent successfully`,
      timeType: timeType
    });

  } catch (error) {
    console.error('❌ Scheduled notification error:', error);
    
    return res.status(500).json({
      error: 'Failed to send scheduled notification',
      details: error.message
    });
  }
}