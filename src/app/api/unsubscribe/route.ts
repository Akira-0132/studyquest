import { NextRequest, NextResponse } from 'next/server';

// 共有ストレージインポート
import { subscriptions, generateSubscriptionKey } from '@/lib/serverStorage';

export async function POST(request: NextRequest) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid subscription required' }, { status: 400 });
    }

    console.log('🗑️ Processing unsubscribe request:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    // エンドポイントをキーとして使用
    const subscriptionKey = generateSubscriptionKey(subscription.endpoint);
    
    // 購読情報を削除
    const deleted = subscriptions.delete(subscriptionKey);

    console.log(`🗑️ Subscription ${deleted ? 'deleted' : 'not found'}: ${subscriptionKey}`);
    console.log(`📊 Remaining subscriptions: ${subscriptions.size}`);

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted ? 'Subscription removed successfully' : 'Subscription not found',
      subscriptionKey,
      remainingSubscriptions: subscriptions.size
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
    return NextResponse.json({
      success: true,
      message: 'Unsubscribe endpoint is available',
      totalSubscriptions: subscriptions.size
    });
  } catch (error: any) {
    console.error('Unsubscribe GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}