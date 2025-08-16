import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';
import type { 
  StudyQuestNotificationPayload, 
  StudyQuestNotificationType, 
  StudyQuestNotificationData 
} from '../../../../types/studyquest-notifications';

// VAPID設定
webpush.setVapidDetails(
  'mailto:studyquest@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0',
  process.env.VAPID_PRIVATE_KEY || '6G5JiT6MSZlBNNXeWTVGy40V7-m176G7iWT3M7j2Fr4'
);

// StudyQuest notification type validation
function validateStudyQuestNotificationType(type: string): type is StudyQuestNotificationType {
  const validTypes: StudyQuestNotificationType[] = [
    'study_reminder', 'exam_alert', 'streak_notification', 'achievement_unlock',
    'schedule_update', 'task_completion', 'level_up', 'badge_earned',
    'streak_warning', 'exam_countdown', 'daily_summary'
  ];
  return validTypes.includes(type as StudyQuestNotificationType);
}

// StudyQuest notification payload generator
function createStudyQuestPayload(
  title: string,
  body: string,
  notificationType: StudyQuestNotificationType,
  data: Partial<StudyQuestNotificationData>,
  options: any = {}
): StudyQuestNotificationPayload {
  
  // Type-specific defaults
  const typeDefaults = {
    'study_reminder': {
      icon: '📚',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'start_studying', title: '勉強を始める', icon: '/icon-96x96.png' },
        { action: 'snooze', title: '10分後に通知', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '後で' }
      ]
    },
    'exam_alert': {
      icon: '⚠️',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      actions: [
        { action: 'view_schedule', title: 'スケジュール確認', icon: '/icon-96x96.png' },
        { action: 'start_studying', title: '今すぐ勉強', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '確認済み' }
      ]
    },
    'streak_notification': {
      icon: '🔥',
      vibrate: [100, 50, 100, 50, 100],
      requireInteraction: true,
      actions: [
        { action: 'view_stats', title: '統計を見る', icon: '/icon-96x96.png' },
        { action: 'continue_streak', title: 'ストリーク継続', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '閉じる' }
      ]
    },
    'achievement_unlock': {
      icon: '🎉',
      vibrate: [200, 100, 200, 100, 200, 100, 300],
      requireInteraction: true,
      actions: [
        { action: 'view_achievement', title: '実績を見る', icon: '/icon-96x96.png' },
        { action: 'share', title: 'シェア', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '閉じる' }
      ]
    },
    'schedule_update': {
      icon: '📅',
      vibrate: [100, 100, 100],
      requireInteraction: false,
      actions: [
        { action: 'view_schedule', title: 'スケジュール確認', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: 'OK' }
      ]
    },
    'task_completion': {
      icon: '✅',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: 'view_stats', title: '統計を見る', icon: '/icon-96x96.png' },
        { action: 'next_task', title: '次のタスク', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '閉じる' }
      ]
    },
    'level_up': {
      icon: '🎉',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      actions: [
        { action: 'view_stats', title: 'ステータス確認', icon: '/icon-96x96.png' },
        { action: 'continue_studying', title: '勉強を続ける', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '閉じる' }
      ]
    },
    'badge_earned': {
      icon: '🏆',
      vibrate: [250, 100, 250, 100, 250],
      requireInteraction: true,
      actions: [
        { action: 'view_badge', title: 'バッジを見る', icon: '/icon-96x96.png' },
        { action: 'share', title: 'シェア', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '閉じる' }
      ]
    },
    'streak_warning': {
      icon: '⚠️',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'start_studying', title: '勉強する', icon: '/icon-96x96.png' },
        { action: 'quick_task', title: 'クイックタスク', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '後で' }
      ]
    },
    'exam_countdown': {
      icon: '🎯',
      vibrate: [150, 50, 150, 50, 150],
      requireInteraction: false,
      actions: [
        { action: 'start_studying', title: '勉強開始', icon: '/icon-96x96.png' },
        { action: 'view_schedule', title: 'スケジュール', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: 'OK' }
      ]
    },
    'daily_summary': {
      icon: '📊',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      actions: [
        { action: 'view_stats', title: '詳細を見る', icon: '/icon-96x96.png' },
        { action: 'plan_tomorrow', title: '明日の予定', icon: '/icon-96x96.png' },
        { action: 'dismiss', title: '閉じる' }
      ]
    }
  };

  const defaults = typeDefaults[notificationType] || typeDefaults['study_reminder'];

  return {
    title,
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: `studyquest-${notificationType}-${Date.now()}`,
    requireInteraction: defaults.requireInteraction,
    silent: false, // Always false for iOS compatibility
    vibrate: defaults.vibrate,
    renotify: true,
    timestamp: Date.now(),
    data: {
      ...data,
      type: notificationType,
      url: data.url || 'https://studyquest.vercel.app',
      timestamp: Date.now(),
      source: 'immediate'
    } as StudyQuestNotificationData,
    actions: defaults.actions,
    dir: 'ltr',
    lang: 'ja',
    ...options
  };
}

export async function POST(request: NextRequest) {
  try {
    const { 
      subscription, 
      title, 
      body, 
      notificationType = 'study_reminder',
      data = {},
      options = {} 
    } = await request.json();

    // Validation
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid subscription required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!validateStudyQuestNotificationType(notificationType)) {
      return NextResponse.json({ 
        error: 'Invalid notification type',
        validTypes: ['study_reminder', 'exam_alert', 'streak_notification', 'achievement_unlock', 'schedule_update']
      }, { status: 400 });
    }

    console.log('📤 Sending StudyQuest notification:', {
      type: notificationType,
      title,
      body: body?.substring(0, 50) + '...',
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    // StudyQuest特化型ペイロード作成
    const payload = createStudyQuestPayload(title, body, notificationType, data, options);

    // StudyQuest通知送信
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log('✅ StudyQuest notification sent successfully:', {
        type: notificationType,
        tag: payload.tag
      });
      
      return NextResponse.json({
        success: true,
        message: 'StudyQuest notification sent successfully',
        notificationType,
        tag: payload.tag,
        timestamp: Date.now()
      });
      
    } catch (pushError: any) {
      console.error('❌ StudyQuest push notification failed:', pushError);
      
      // StudyQuest特化型エラー分析
      let errorMessage = 'StudyQuest push notification failed';
      let statusCode = 500;
      let recoverable = true;
      let suggestedAction = 'Retry the request';
      
      if (pushError.statusCode === 410) {
        errorMessage = 'Push subscription expired';
        statusCode = 410;
        recoverable = false;
        suggestedAction = 'Re-subscribe to push notifications';
      } else if (pushError.statusCode === 413) {
        errorMessage = 'Notification payload too large';
        statusCode = 413;
        recoverable = true;
        suggestedAction = 'Reduce notification content size';
      } else if (pushError.statusCode === 400) {
        errorMessage = 'Invalid subscription or payload format';
        statusCode = 400;
        recoverable = true;
        suggestedAction = 'Check subscription and payload format';
      } else if (pushError.statusCode === 429) {
        errorMessage = 'Rate limit exceeded';
        statusCode = 429;
        recoverable = true;
        suggestedAction = 'Wait before retrying';
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: pushError.message,
        pushErrorCode: pushError.statusCode,
        notificationType,
        recoverable,
        suggestedAction,
        timestamp: Date.now()
      }, { status: statusCode });
    }

  } catch (error: any) {
    console.error('StudyQuest send notification API error:', error);
    return NextResponse.json({ 
      error: 'StudyQuest notification service error',
      details: error.message,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

// GET method for StudyQuest notification API status
export async function GET() {
  try {
    return NextResponse.json({
      service: 'StudyQuest Notification API',
      status: 'active',
      supportedTypes: [
        'study_reminder', 'exam_alert', 'streak_notification', 
        'achievement_unlock', 'schedule_update', 'task_completion',
        'level_up', 'badge_earned', 'streak_warning', 
        'exam_countdown', 'daily_summary'
      ],
      features: [
        'iOS PWA optimization',
        'Type-specific routing',
        'Custom action handlers',
        'Structured payloads'
      ],
      timestamp: Date.now()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Service status check failed',
      details: error.message 
    }, { status: 500 });
  }
}