// プッシュ購読削除API
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

  const { subscription } = req.body;

  if (!subscription) {
    return res.status(400).json({ error: 'Subscription required' });
  }

  console.log('🗑️ Subscription unsubscribe request received');
  
  // ここでは成功を返す（実際の削除は subscribe.js で処理）
  return res.status(200).json({
    success: true,
    message: 'Unsubscribe request processed'
  });
}