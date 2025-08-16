import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

export async function POST(request: NextRequest) {
  try {
    const { subscription, title, body, options = {} } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid subscription required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log('📤 Sending notification:', {
      title,
      body: body?.substring(0, 50) + '...',
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    // プッシュ通知ペイロード作成
    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      data: {
        url: 'https://studyquest.vercel.app',
        type: 'test-notification',
        timestamp: Date.now()
      },
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      tag: 'studyquest-notification',
      ...options
    });

    // プッシュ通知送信
    try {
      await webpush.sendNotification(subscription, payload);
      console.log('✅ Notification sent successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully',
        timestamp: Date.now()
      });
    } catch (pushError: any) {
      console.error('❌ Push notification failed:', pushError);
      
      // プッシュ通知エラーの詳細分析
      let errorMessage = 'Push notification failed';
      let statusCode = 500;
      
      if (pushError.statusCode === 410) {
        errorMessage = 'Subscription expired';
        statusCode = 410;
      } else if (pushError.statusCode === 413) {
        errorMessage = 'Payload too large';
        statusCode = 413;
      } else if (pushError.statusCode === 400) {
        errorMessage = 'Invalid subscription or payload';
        statusCode = 400;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: pushError.message,
        pushErrorCode: pushError.statusCode
      }, { status: statusCode });
    }

  } catch (error: any) {
    console.error('Send notification API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}