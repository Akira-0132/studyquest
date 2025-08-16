import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// 共有ストレージインポート
import { notificationSchedules } from '@/lib/serverStorage';

export async function POST(request: NextRequest) {
  try {
    console.log('⏰ Checking for scheduled notifications to send...');
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    console.log(`🕐 Current time: ${currentTime}`);
    
    let sentCount = 0;
    let errorCount = 0;
    const results = [];
    
    // すべての登録済みスケジュールをチェック
    for (const [key, scheduleData] of notificationSchedules.entries()) {
      if (!scheduleData.active) {
        continue;
      }
      
      const { subscription, schedule } = scheduleData;
      
      // 時刻マッチングをチェック（±1分の誤差を許容）
      const timeMatches = [
        { type: 'morning', time: schedule.morning, message: 'おはよう！今日も頑張ろう！🌅', title: 'StudyQuest 🌅 朝の学習' },
        { type: 'afternoon', time: schedule.afternoon, message: '学校お疲れさま！集中して勉強しましょう！📚', title: 'StudyQuest 📚 午後の学習' },
        { type: 'evening', time: schedule.evening, message: 'ラストスパート！今日の目標を達成しよう！🌙', title: 'StudyQuest 🌙 夜の学習' }
      ];
      
      for (const timeSlot of timeMatches) {
        const [scheduleHour, scheduleMinute] = timeSlot.time.split(':').map(Number);
        
        // ±1分の範囲で時刻マッチング
        if (Math.abs(currentHour - scheduleHour) === 0 && Math.abs(currentMinute - scheduleMinute) <= 1) {
          console.log(`🎯 Time match found: ${timeSlot.type} at ${timeSlot.time} for ${key}`);
          
          try {
            const payload = JSON.stringify({
              title: timeSlot.title,
              body: timeSlot.message,
              icon: '/icon-192x192.png',
              badge: '/icon-96x96.png',
              data: {
                url: 'https://studyquest.vercel.app',
                type: 'scheduled-notification',
                timeType: timeSlot.type,
                timestamp: Date.now()
              },
              requireInteraction: true,
              silent: false,
              vibrate: [200, 100, 200],
              tag: `studyquest-scheduled-${timeSlot.type}`,
              actions: [
                { action: 'open', title: '勉強を始める', icon: '/icon-96x96.png' },
                { action: 'dismiss', title: '後で' }
              ]
            });

            await webpush.sendNotification(subscription, payload);
            
            console.log(`✅ Scheduled notification sent: ${timeSlot.type} to ${key}`);
            sentCount++;
            
            results.push({
              subscriptionKey: key,
              timeType: timeSlot.type,
              scheduledTime: timeSlot.time,
              status: 'sent',
              endpoint: subscription.endpoint.substring(0, 30) + '...'
            });
            
            // 送信成功時に lastScheduled を更新
            scheduleData.lastScheduled = now;
            
          } catch (pushError: any) {
            console.error(`❌ Failed to send scheduled notification for ${timeSlot.type} to ${key}:`, pushError);
            errorCount++;
            
            results.push({
              subscriptionKey: key,
              timeType: timeSlot.type,
              scheduledTime: timeSlot.time,
              status: 'failed',
              error: pushError.message,
              endpoint: subscription.endpoint.substring(0, 30) + '...'
            });
            
            // 410エラー（期限切れ）の場合はスケジュールを無効化
            if (pushError.statusCode === 410) {
              console.log(`🗑️ Deactivating expired subscription: ${key}`);
              scheduleData.active = false;
            }
          }
        }
      }
    }
    
    console.log(`📊 Scheduled notifications check complete: ${sentCount} sent, ${errorCount} failed`);
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications check completed',
      currentTime,
      summary: {
        sent: sentCount,
        failed: errorCount,
        totalChecked: notificationSchedules.size
      },
      results
    });
    
  } catch (error: any) {
    console.error('Send scheduled notifications API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return NextResponse.json({
      success: true,
      message: 'Send scheduled notifications endpoint is available',
      currentTime,
      activeSchedules: notificationSchedules.size,
      info: 'POST to this endpoint to check and send due notifications'
    });
  } catch (error: any) {
    console.error('Send scheduled notifications GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}