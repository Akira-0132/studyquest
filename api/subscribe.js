// プッシュ購読管理API
const webpush = require('web-push');

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// 簡易的な購読情報ストレージ（本格実装はデータベース使用）
// グローバルに共有するためexport
export const subscriptions = new Map();

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      return await handleSubscribe(req, res);
    } else if (req.method === 'DELETE') {
      return await handleUnsubscribe(req, res);
    } else if (req.method === 'GET') {
      return await handleGetSubscriptions(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Subscribe API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// プッシュ購読を保存
async function handleSubscribe(req, res) {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription required' });
  }

  // エンドポイントをキーとして使用
  const subscriptionKey = btoa(subscription.endpoint).substring(0, 20);
  
  // 購読情報を保存
  subscriptions.set(subscriptionKey, {
    subscription,
    createdAt: new Date(),
    lastUsed: new Date()
  });

  console.log(`✅ Subscription saved: ${subscriptionKey}`);
  console.log(`📊 Total subscriptions: ${subscriptions.size}`);

  // すぐに確認テスト通知を送信
  try {
    const payload = JSON.stringify({
      title: 'StudyQuest 🎉',
      body: 'プッシュ通知の設定が完了しました！',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      data: {
        url: 'https://studyquest.vercel.app',
        type: 'subscription-confirmed',
        timestamp: Date.now()
      },
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      tag: 'studyquest-confirm'
    });

    await webpush.sendNotification(subscription, payload);
    console.log('🚀 Confirmation notification sent');
    
  } catch (notificationError) {
    console.warn('⚠️ Confirmation notification failed:', notificationError);
  }

  return res.status(200).json({
    success: true,
    message: 'Subscription saved successfully',
    subscriptionKey,
    totalSubscriptions: subscriptions.size
  });
}

// プッシュ購読を削除
async function handleUnsubscribe(req, res) {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription required' });
  }

  const subscriptionKey = btoa(subscription.endpoint).substring(0, 20);
  const deleted = subscriptions.delete(subscriptionKey);

  console.log(`🗑️ Subscription ${deleted ? 'deleted' : 'not found'}: ${subscriptionKey}`);

  return res.status(200).json({
    success: true,
    deleted,
    message: deleted ? 'Subscription removed' : 'Subscription not found'
  });
}

// 購読情報一覧取得（デバッグ用）
async function handleGetSubscriptions(req, res) {
  const subscriptionList = Array.from(subscriptions.entries()).map(([key, data]) => ({
    key,
    createdAt: data.createdAt,
    lastUsed: data.lastUsed,
    endpoint: data.subscription.endpoint.substring(0, 50) + '...'
  }));

  return res.status(200).json({
    success: true,
    totalSubscriptions: subscriptions.size,
    subscriptions: subscriptionList
  });
}