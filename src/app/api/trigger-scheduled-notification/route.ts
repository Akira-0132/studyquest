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
    const { scheduleType = 'manual', subscription, title, body } = await request.json();

    console.log('⏰ Triggering scheduled notification:', {
      scheduleType,
      title,
      body: body?.substring(0, 50) + '...',
      endpoint: subscription?.endpoint?.substring(0, 50) + '...'
    });

    let notifications = [];

    if (scheduleType === 'manual' && subscription) {
      // 手動トリガー（特定の購読者へ）
      notifications.push({
        subscription,
        title: title || 'StudyQuest リマインダー',
        body: body || '勉強の時間です！📚'
      });
    } else if (scheduleType === 'all') {
      // 全ての購読者へのスケジュール通知
      const currentHour = new Date().getHours();
      let defaultTitle = 'StudyQuest リマインダー';
      let defaultBody = '勉強の時間です！📚';

      if (currentHour < 12) {
        defaultTitle = 'StudyQuest 🌅 おはよう！';
        defaultBody = '新しい一日の始まりです！今日も頑張りましょう！';
      } else if (currentHour < 18) {
        defaultTitle = 'StudyQuest 📚 午後の学習';
        defaultBody = '学校お疲れさま！集中して勉強しましょう！';
      } else {
        defaultTitle = 'StudyQuest 🌙 夜の学習';
        defaultBody = 'ラストスパート！今日の目標を達成しよう！';
      }

      // 全スケジュールからアクティブなものを取得
      notificationSchedules.forEach((scheduleData, key) => {
        if (scheduleData.active) {
          notifications.push({
            subscription: scheduleData.subscription,
            title: title || defaultTitle,
            body: body || defaultBody
          });
        }
      });
    }

    if (notifications.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active subscriptions found',
        sent: 0
      });
    }

    // 通知送信結果
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const notification of notifications) {
      try {
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          data: {
            url: 'https://studyquest.vercel.app',
            type: 'scheduled-notification',
            timestamp: Date.now(),
            scheduleType
          },
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200],
          tag: 'studyquest-scheduled'
        });

        await webpush.sendNotification(notification.subscription, payload);
        
        results.push({
          endpoint: notification.subscription.endpoint.substring(0, 50) + '...',
          success: true
        });
        successCount++;
        
        console.log('✅ Scheduled notification sent successfully');
        
      } catch (pushError: any) {
        console.error('❌ Scheduled notification failed:', pushError);
        
        results.push({
          endpoint: notification.subscription.endpoint.substring(0, 50) + '...',
          success: false,
          error: pushError.message
        });
        failureCount++;
      }
    }

    console.log(`📊 Scheduled notification summary: ${successCount} sent, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications processed',
      summary: {
        total: notifications.length,
        sent: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error: any) {
    console.error('Trigger scheduled notification API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    return NextResponse.json({
      success: true,
      message: 'Trigger scheduled notification endpoint is available',
      currentTime: currentTime.toISOString(),
      currentHour,
      currentMinute,
      activeSchedules: notificationSchedules.size
    });
  } catch (error: any) {
    console.error('Trigger scheduled notification GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}