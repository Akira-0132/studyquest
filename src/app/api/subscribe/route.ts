// プッシュ購読管理API
import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// 共有ストレージインポート
import { subscriptions, generateSubscriptionKey } from '@/lib/serverStorage';

export async function POST(request: NextRequest) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid subscription required' }, { status: 400 });
    }

    // エンドポイントをキーとして使用
    const subscriptionKey = generateSubscriptionKey(subscription.endpoint);
    
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

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
      subscriptionKey,
      totalSubscriptions: subscriptions.size
    });
  } catch (error: any) {
    console.error('Subscribe API error:', error);
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
    const deleted = subscriptions.delete(subscriptionKey);

    console.log(`🗑️ Subscription ${deleted ? 'deleted' : 'not found'}: ${subscriptionKey}`);

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted ? 'Subscription removed' : 'Subscription not found'
    });
  } catch (error: any) {
    console.error('Unsubscribe API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const subscriptionList = Array.from(subscriptions.entries()).map(([key, data]: [string, any]) => ({
      key,
      createdAt: data.createdAt,
      lastUsed: data.lastUsed,
      endpoint: data.subscription.endpoint.substring(0, 50) + '...'
    }));

    return NextResponse.json({
      success: true,
      totalSubscriptions: subscriptions.size,
      subscriptions: subscriptionList
    });
  } catch (error: any) {
    console.error('Get subscriptions API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}