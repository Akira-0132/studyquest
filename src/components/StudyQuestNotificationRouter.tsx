'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { StudyQuestNotificationType } from '../../types/studyquest-notifications';

// StudyQuest notification routing configuration
const NOTIFICATION_ROUTES: Record<StudyQuestNotificationType, string> = {
  'study_reminder': '/',
  'exam_alert': '/schedule',
  'streak_notification': '/',
  'achievement_unlock': '/settings',
  'schedule_update': '/schedule',
  'task_completion': '/',
  'level_up': '/settings',
  'badge_earned': '/settings',
  'streak_warning': '/',
  'exam_countdown': '/schedule',
  'daily_summary': '/'
};

interface StudyQuestActionPayload {
  action: string;
  payload: any;
}

export function StudyQuestNotificationRouter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // StudyQuest通知からの起動を処理
  const handleNotificationNavigation = useCallback(() => {
    const from = searchParams.get('from');
    const notificationType = searchParams.get('type') as StudyQuestNotificationType;
    const action = searchParams.get('action');
    const examId = searchParams.get('examId');
    const taskId = searchParams.get('taskId');
    const achievement = searchParams.get('achievement');
    const priority = searchParams.get('priority');

    if (from === 'notification' && notificationType) {
      console.log('🎯 StudyQuest notification navigation detected:', {
        type: notificationType,
        action,
        examId,
        taskId,
        achievement,
        priority
      });

      // StudyQuest特化型アクション処理
      handleStudyQuestNotificationAction(notificationType, action, {
        examId,
        taskId,
        achievement,
        priority
      });

      // URLを綺麗にするためクエリパラメータを削除
      const currentPath = window.location.pathname;
      const baseRoute = NOTIFICATION_ROUTES[notificationType] || '/';
      
      if (currentPath !== baseRoute) {
        router.replace(baseRoute);
      } else {
        // 同じページの場合はクエリパラメータのみ削除
        router.replace(currentPath);
      }
    }
  }, [searchParams, router]);

  // StudyQuest通知アクション処理
  const handleStudyQuestNotificationAction = useCallback((
    type: StudyQuestNotificationType,
    action: string | null,
    data: Record<string, string | null>
  ) => {
    const actionHandlers = {
      'start_studying': () => {
        console.log('🎮 StudyQuest: Starting study session');
        // 学習セッション開始のロジック
        triggerStudyQuestEvent('START_STUDY_SESSION', { type, ...data });
        
        // UIの状態を学習モードに変更
        showStudyQuestToast('勉強を始めましょう！', 'success');
      },

      'view_schedule': () => {
        console.log('🎮 StudyQuest: Opening schedule');
        if (data.examId) {
          // 特定の試験にフォーカス
          triggerStudyQuestEvent('FOCUS_EXAM', { examId: data.examId });
        }
        triggerStudyQuestEvent('NAVIGATE_TO_SCHEDULE', { type, ...data });
      },

      'view_stats': () => {
        console.log('🎮 StudyQuest: Opening stats');
        triggerStudyQuestEvent('OPEN_STATS_MODAL', { focusType: type, ...data });
      },

      'view_achievement': () => {
        console.log('🎮 StudyQuest: Showing achievement');
        if (data.achievement) {
          triggerStudyQuestEvent('SHOW_ACHIEVEMENT', { 
            achievementId: data.achievement,
            celebrationType: 'notification'
          });
        }
      },

      'continue_streak': () => {
        console.log('🎮 StudyQuest: Highlighting streak');
        triggerStudyQuestEvent('HIGHLIGHT_STREAK', { type, ...data });
        showStudyQuestToast('ストリーク継続中！頑張りましょう！', 'success');
      },

      'snooze': () => {
        console.log('🎮 StudyQuest: Snoozing notification');
        triggerStudyQuestEvent('SNOOZE_NOTIFICATION', { 
          duration: 10,
          type,
          ...data
        });
        showStudyQuestToast('10分後に再通知します', 'info');
      },

      'share': () => {
        console.log('🎮 StudyQuest: Opening share dialog');
        triggerStudyQuestEvent('OPEN_SHARE_MODAL', { type, ...data });
      }
    };

    // アクション実行
    if (action && actionHandlers[action as keyof typeof actionHandlers]) {
      actionHandlers[action as keyof typeof actionHandlers]();
    } else {
      // デフォルトアクション: タイプ別の基本処理
      handleDefaultNotificationAction(type, data);
    }
  }, []);

  // デフォルト通知アクション
  const handleDefaultNotificationAction = useCallback((
    type: StudyQuestNotificationType,
    data: Record<string, string | null>
  ) => {
    const defaultActions = {
      'study_reminder': () => {
        triggerStudyQuestEvent('SHOW_TODAY_TASKS', { highlighted: true });
        showStudyQuestToast('今日のタスクを確認しましょう', 'info');
      },

      'exam_alert': () => {
        if (data.examId) {
          triggerStudyQuestEvent('FOCUS_EXAM', { examId: data.examId });
        }
        triggerStudyQuestEvent('HIGHLIGHT_URGENT_EXAMS', {});
        showStudyQuestToast('試験が近づいています！', 'warning');
      },

      'streak_notification': () => {
        triggerStudyQuestEvent('HIGHLIGHT_STREAK', { celebrationType: 'notification' });
      },

      'achievement_unlock': () => {
        triggerStudyQuestEvent('SHOW_RECENT_ACHIEVEMENTS', {});
        showStudyQuestToast('新しい実績を獲得しました！', 'success');
      },

      'schedule_update': () => {
        triggerStudyQuestEvent('REFRESH_SCHEDULE', {});
        showStudyQuestToast('スケジュールが更新されました', 'info');
      },

      'task_completion': () => {
        triggerStudyQuestEvent('HIGHLIGHT_COMPLETED_TASKS', {});
      },

      'level_up': () => {
        triggerStudyQuestEvent('SHOW_LEVEL_UP_CELEBRATION', {});
      },

      'badge_earned': () => {
        triggerStudyQuestEvent('SHOW_BADGE_COLLECTION', {});
      },

      'streak_warning': () => {
        triggerStudyQuestEvent('SHOW_STREAK_WARNING', {});
        showStudyQuestToast('ストリークが途切れそうです！', 'warning');
      },

      'exam_countdown': () => {
        triggerStudyQuestEvent('SHOW_EXAM_COUNTDOWN', { examId: data.examId });
      },

      'daily_summary': () => {
        triggerStudyQuestEvent('SHOW_DAILY_SUMMARY', {});
      }
    };

    const handler = defaultActions[type];
    if (handler) {
      handler();
    }
  }, []);

  // StudyQuestカスタムイベント発火
  const triggerStudyQuestEvent = useCallback((eventType: string, payload: any) => {
    const event = new CustomEvent('studyquest-action', {
      detail: {
        action: eventType,
        payload,
        timestamp: Date.now(),
        source: 'notification-router'
      }
    });
    
    window.dispatchEvent(event);
    console.log(`🎯 StudyQuest event triggered: ${eventType}`, payload);
  }, []);

  // StudyQuestトースト表示
  const showStudyQuestToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    const toastEvent = new CustomEvent('studyquest-toast', {
      detail: {
        message,
        type,
        duration: 3000,
        source: 'notification-router'
      }
    });
    
    window.dispatchEvent(toastEvent);
  }, []);

  // Service Workerからのメッセージをリスン
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, action, url, notificationType, data } = event.data;
    
    if (type === 'STUDYQUEST_NAVIGATE') {
      console.log('🎯 StudyQuest Service Worker navigation:', { url, notificationType, action });
      
      if (notificationType && action) {
        handleStudyQuestNotificationAction(notificationType, action, data || {});
      }
      
      if (url && url !== window.location.pathname) {
        router.push(url);
      }
    }
  }, [router, handleStudyQuestNotificationAction]);

  // エフェクト: 初期化とイベントリスナー設定
  useEffect(() => {
    // URL パラメータからの通知処理
    handleNotificationNavigation();

    // Service Worker メッセージリスナー
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // クリーンアップ
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [handleNotificationNavigation, handleServiceWorkerMessage]);

  // このコンポーネントはUIを持たない
  return null;
}