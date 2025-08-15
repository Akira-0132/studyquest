'use client';

import { useState, useCallback } from 'react';
import type { ToastNotification } from '@/components/NotificationToast';

export function useNotifications() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: ToastNotification = {
      ...notification,
      id,
    };

    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showLevelUp = useCallback((newLevel: number) => {
    addNotification({
      type: 'levelUp',
      title: 'レベルアップ！',
      message: `レベル ${newLevel} に到達しました！`,
      icon: '⭐',
      duration: 5000,
    });
  }, [addNotification]);

  const showBadgeEarned = useCallback((badgeText: string) => {
    addNotification({
      type: 'badge',
      title: 'バッジ獲得！',
      message: badgeText,
      icon: '🎖️',
      duration: 5000,
    });
  }, [addNotification]);

  const showStreakRecord = useCallback((streakCount: number) => {
    addNotification({
      type: 'streak',
      title: '新記録達成！',
      message: `${streakCount}日連続学習を達成しました！`,
      icon: '🔥',
      duration: 5000,
    });
  }, [addNotification]);

  const showTaskComplete = useCallback((taskTitle: string, exp: number) => {
    addNotification({
      type: 'achievement',
      title: 'タスク完了！',
      message: `${taskTitle} (+${exp} EXP)`,
      icon: '✅',
      duration: 3000,
    });
  }, [addNotification]);

  const showStreakWarning = useCallback((hoursLeft: number) => {
    addNotification({
      type: 'streak',
      title: 'ストリーク警告！',
      message: `あと${Math.floor(hoursLeft)}時間でストリークが途切れます`,
      icon: '⚠️',
      duration: 6000,
    });
  }, [addNotification]);

  return {
    notifications,
    dismissNotification,
    showLevelUp,
    showBadgeEarned,
    showStreakRecord,
    showTaskComplete,
    showStreakWarning,
  };
}