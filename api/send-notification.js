const webpush = require('web-push');

// VAPID キーの設定（環境変数から読み込み）
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, title, body, icon, badge } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription required' });
    }

    const payload = JSON.stringify({
      title: title || 'StudyQuest',
      body: body || '学習リマインダーです！',
      icon: icon || '/icon-192x192.png',
      badge: badge || '/icon-96x96.png',
      data: {
        url: 'https://studyquest.vercel.app',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: '開く',
          icon: '/icon-192x192.png'
        }
      ],
      requireInteraction: true, // 重要：通知を永続化
      silent: false,
      vibrate: [200, 100, 200] // バイブレーション
    });

    console.log('Sending push notification:', {
      endpoint: subscription.endpoint,
      title,
      body
    });

    const result = await webpush.sendNotification(subscription, payload);

    console.log('Push notification sent successfully:', result);

    return res.status(200).json({ 
      success: true,
      message: 'Notification sent successfully' 
    });

  } catch (error) {
    console.error('Push notification error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
}