import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';
import type { 
  StudyQuestNotificationPayload, 
  StudyReminderData,
  StudyQuestNotificationType 
} from '../../../../types/studyquest-notifications';

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// 共有ストレージインポート
import { notificationSchedules } from '@/lib/serverStorage';

// StudyQuest スケジュール通知生成
function createStudyQuestScheduledPayload(
  timeType: 'morning' | 'afternoon' | 'evening',
  scheduledTime: string
): StudyQuestNotificationPayload {
  
  const timeData = {
    'morning': {
      title: 'StudyQuest 🌅 朝の学習',
      messages: [
        'おはよう！今日も頑張ろう！新しい一日の始まりです。',
        '朝の学習は効果的！脳がフレッシュな今がチャンス。',
        '早起きは三文の徳！今日の目標を達成しましょう。'
      ],
      vibrate: [200, 100, 200, 100, 200]
    },
    'afternoon': {
      title: 'StudyQuest 📚 午後の学習',
      messages: [
        '学校お疲れさま！午後の学習時間です。',
        '集中タイム！今日学んだことを復習しましょう。',
        '午後の復習は記憶定着に効果的です。'
      ],
      vibrate: [150, 100, 150, 100, 150]
    },
    'evening': {
      title: 'StudyQuest 🌙 夜の学習',
      messages: [
        '夜の学習時間です。今日の仕上げをしましょう！',
        '一日の締めくくり。継続記録を維持しよう！',
        '夜の復習で今日の学習を完璧に！'
      ],
      vibrate: [100, 50, 100, 50, 100, 50, 200]
    }
  };

  const data = timeData[timeType];
  const randomMessage = data.messages[Math.floor(Math.random() * data.messages.length)];

  const studyReminderData: StudyReminderData = {
    type: 'study_reminder',
    timeSlot: timeType,
    scheduledTime,
    tasksCount: Math.floor(Math.random() * 5) + 1, // 1-5 tasks
    streakCount: Math.floor(Math.random() * 30) + 1, // 1-30 days
    url: '/',
    timestamp: Date.now(),
    source: 'scheduled',
    motivationalMessage: randomMessage
  };

  return {
    title: data.title,
    body: randomMessage,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: `studyquest-scheduled-${timeType}-${Date.now()}`,
    requireInteraction: true,
    silent: false,
    vibrate: data.vibrate,
    renotify: true,
    timestamp: Date.now(),
    data: studyReminderData,
    actions: [
      { action: 'start_studying', title: '勉強を始める', icon: '/icon-96x96.png' },
      { action: 'snooze', title: '10分後に通知', icon: '/icon-96x96.png' },
      { action: 'dismiss', title: '後で' }
    ],
    dir: 'ltr',
    lang: 'ja'
  };
}

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
      
      // StudyQuest 時刻マッチングをチェック（±1分の誤差を許容）
      const timeMatches = [
        { type: 'morning' as const, time: schedule.morning },
        { type: 'afternoon' as const, time: schedule.afternoon },
        { type: 'evening' as const, time: schedule.evening }
      ];
      
      for (const timeSlot of timeMatches) {
        if (!timeSlot.time) continue; // スケジュールが設定されていない場合はスキップ
        
        const [scheduleHour, scheduleMinute] = timeSlot.time.split(':').map(Number);
        
        // ±1分の範囲で時刻マッチング
        if (Math.abs(currentHour - scheduleHour) === 0 && Math.abs(currentMinute - scheduleMinute) <= 1) {
          console.log(`🎯 StudyQuest time match found: ${timeSlot.type} at ${timeSlot.time} for ${key}`);
          
          try {
            // StudyQuest特化型スケジュール通知ペイロード生成
            const studyQuestPayload = createStudyQuestScheduledPayload(timeSlot.type, timeSlot.time);
            
            console.log('📤 Sending StudyQuest scheduled notification:', {
              type: timeSlot.type,
              title: studyQuestPayload.title,
              time: timeSlot.time
            });

            await webpush.sendNotification(subscription, JSON.stringify(studyQuestPayload));
            
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