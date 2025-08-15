// Vercel Cronジョブによる定期通知送信
const webpush = require('web-push');

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// 他のAPIから購読情報をインポート
const { schedules } = require('./schedule-notifications');

export default async function handler(req, res) {
  // Vercel Cronからのリクエストかチェック
  const authHeader = req.headers['authorization'];
  const isFromCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  // 開発環境またはCronからのアクセスのみ許可
  if (process.env.NODE_ENV === 'production' && !isFromCron && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Cron job triggered at:', new Date().toISOString());
  
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`🕐 Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
    
    // 5分ごとに実行されるので、5分の幅で時刻をチェック
    const notifications = [];
    
    // 購読情報を取得（実際にはデータベースから取得）
    const testSubscriptions = await getActiveSubscriptions();
    
    for (const subData of testSubscriptions) {
      const { subscription, schedule } = subData;
      
      // 各時間帯をチェック
      const timeSlots = [
        { key: 'morning', time: schedule.morning || '07:00', message: '🌅 おはよう！今日も学習を頑張ろう！' },
        { key: 'afternoon', time: schedule.afternoon || '16:00', message: '📚 午後の学習タイムです！' },
        { key: 'evening', time: schedule.evening || '20:00', message: '🌙 今日の学習の仕上げをしよう！' }
      ];
      
      for (const slot of timeSlots) {
        const [scheduleHour, scheduleMinute] = slot.time.split(':').map(Number);
        
        // 現在時刻から5分以内の通知をチェック
        if (scheduleHour === currentHour && 
            Math.abs(scheduleMinute - currentMinute) < 5) {
          
          try {
            const payload = JSON.stringify({
              title: 'StudyQuest 📚',
              body: slot.message,
              icon: '/icon-192x192.png',
              badge: '/icon-96x96.png',
              data: {
                url: 'https://studyquest.vercel.app',
                type: `scheduled-${slot.key}`,
                timestamp: Date.now()
              },
              actions: [
                {
                  action: 'open',
                  title: '開く',
                  icon: '/icon-192x192.png'
                }
              ],
              requireInteraction: true,
              silent: false,
              vibrate: [200, 100, 200, 100, 200],
              tag: `studyquest-${slot.key}`
            });
            
            await webpush.sendNotification(subscription, payload);
            
            notifications.push({
              time: slot.time,
              type: slot.key,
              status: 'sent'
            });
            
            console.log(`✅ Sent ${slot.key} notification at ${slot.time}`);
            
          } catch (error) {
            console.error(`❌ Failed to send notification:`, error);
            notifications.push({
              time: slot.time,
              type: slot.key,
              status: 'failed',
              error: error.message
            });
          }
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      notificationsSent: notifications.length,
      notifications: notifications
    });
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      details: error.message
    });
  }
}

// アクティブな購読情報を取得
async function getActiveSubscriptions() {
  // schedule-notifications.jsから購読情報を取得
  const activeSchedules = [];
  
  for (const [userKey, userData] of schedules.entries()) {
    if (userData.subscription && userData.schedule) {
      activeSchedules.push({
        subscription: userData.subscription,
        schedule: userData.schedule,
        userKey: userKey
      });
    }
  }
  
  console.log(`📊 Found ${activeSchedules.length} active subscriptions`);
  return activeSchedules;
}

