import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// 共有ストレージインポート
import { notificationSchedules, generateSubscriptionKey } from '@/lib/serverStorage';

export async function POST(request: NextRequest) {
  try {
    const { subscription, schedule } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid subscription required' }, { status: 400 });
    }

    if (!schedule || !schedule.morning || !schedule.afternoon || !schedule.evening) {
      return NextResponse.json({ error: 'Valid schedule required (morning, afternoon, evening)' }, { status: 400 });
    }

    console.log('📅 Setting up notification schedule:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      schedule
    });

    // エンドポイントをキーとして使用
    const subscriptionKey = generateSubscriptionKey(subscription.endpoint);
    
    // スケジュール情報を保存
    notificationSchedules.set(subscriptionKey, {
      subscription,
      schedule,
      createdAt: new Date(),
      lastScheduled: new Date(),
      active: true
    });

    console.log(`✅ Notification schedule saved: ${subscriptionKey}`);
    console.log(`📊 Total scheduled subscriptions: ${notificationSchedules.size}`);

    // スケジュール確認通知を送信
    try {
      const confirmationPayload = JSON.stringify({
        title: 'StudyQuest 📅',
        body: `通知スケジュールを設定しました！朝${schedule.morning} 昼${schedule.afternoon} 夜${schedule.evening}に通知します。`,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        data: {
          url: 'https://studyquest.vercel.app',
          type: 'schedule-confirmed',
          timestamp: Date.now(),
          schedule
        },
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        tag: 'studyquest-schedule'
      });

      await webpush.sendNotification(subscription, confirmationPayload);
      console.log('🚀 Schedule confirmation notification sent');
      
    } catch (notificationError) {
      console.warn('⚠️ Schedule confirmation notification failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification schedule saved successfully',
      subscriptionKey,
      schedule,
      totalSchedules: notificationSchedules.size
    });

  } catch (error: any) {
    console.error('Schedule notifications API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const scheduleList = Array.from(notificationSchedules.entries()).map(([key, data]: [string, any]) => ({
      key,
      schedule: data.schedule,
      createdAt: data.createdAt,
      lastScheduled: data.lastScheduled,
      active: data.active,
      endpoint: data.subscription.endpoint.substring(0, 50) + '...'
    }));

    return NextResponse.json({
      success: true,
      totalSchedules: notificationSchedules.size,
      schedules: scheduleList
    });
  } catch (error: any) {
    console.error('Get schedules API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid subscription required' }, { status: 400 });
    }

    const subscriptionKey = generateSubscriptionKey(subscription.endpoint);
    const deleted = notificationSchedules.delete(subscriptionKey);

    console.log(`🗑️ Notification schedule ${deleted ? 'deleted' : 'not found'}: ${subscriptionKey}`);

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted ? 'Schedule removed' : 'Schedule not found'
    });
  } catch (error: any) {
    console.error('Delete schedule API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}