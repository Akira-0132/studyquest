'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { UserStats } from './UserStats';
import { TodayTasks } from './TodayTasks';
import { QuickActions } from './QuickActions';
import { UpcomingExams } from './UpcomingExams';
import { NotificationToast } from './NotificationToast';
import { ClientOnly } from './ClientOnly';
import { useNotifications } from '@/hooks/useNotifications';
import { getTodayTasks, getAllTasks, type Task } from '@/lib/scheduleGenerator';

export function Dashboard() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [greeting, setGreeting] = useState('');
  const notifications = useNotifications();

  useEffect(() => {
    // タスクデータを読み込み
    setTodayTasks(getTodayTasks());
    setAllTasks(getAllTasks());

    // 時間帯に応じた挨拶
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('おはよう！');
    else if (hour < 18) setGreeting('お疲れさま！');
    else setGreeting('お疲れさま！');
  }, []);

  const refreshTasks = () => {
    setTodayTasks(getTodayTasks());
    setAllTasks(getAllTasks());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-4xl mb-2">✨</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {format(new Date(), 'M月d日(E)', { locale: ja })}
          </p>
        </motion.div>

        {/* ユーザー統計 */}
        <ClientOnly fallback={
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        }>
          <UserStats />
        </ClientOnly>

        {/* 今日のタスク */}
        <ClientOnly fallback={
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        }>
          <TodayTasks 
            tasks={todayTasks} 
            onTaskUpdate={refreshTasks}
            notifications={notifications}
          />
        </ClientOnly>

        {/* クイックアクション */}
        <QuickActions />

        {/* 今後の試験 */}
        <ClientOnly fallback={
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        }>
          <UpcomingExams />
        </ClientOnly>

        {/* 励ましメッセージ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white text-center"
        >
          <div className="text-2xl mb-2">💪</div>
          <p className="font-medium">
            継続は力なり！今日も一歩ずつ前進しよう
          </p>
        </motion.div>

        {/* 通知システム */}
        <NotificationToast
          notifications={notifications.notifications}
          onDismiss={notifications.dismissNotification}
        />
      </div>
    </div>
  );
}