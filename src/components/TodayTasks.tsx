'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateTaskCompletion, type Task } from '@/lib/scheduleGenerator';
import type { useNotifications } from '@/hooks/useNotifications';

interface TodayTasksProps {
  tasks: Task[];
  onTaskUpdate: () => void;
  notifications: ReturnType<typeof useNotifications>;
}

export function TodayTasks({ tasks, onTaskUpdate, notifications }: TodayTasksProps) {
  const [confettiTasks, setConfettiTasks] = useState<Set<string>>(new Set());

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    const result = updateTaskCompletion(taskId, completed);
    
    if (completed) {
      // 紙吹雪エフェクトを表示
      setConfettiTasks(prev => new Set([...prev, taskId]));
      setTimeout(() => {
        setConfettiTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 1000);

      // タスク完了通知
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        notifications.showTaskComplete(task.title, task.earnedExp || 0);
      }

      // レベルアップ通知
      if (result.leveledUp && result.newLevel) {
        notifications.showLevelUp(result.newLevel);
      }

      // ストリーク通知
      if (result.streakUpdate?.earnedBadge) {
        notifications.showBadgeEarned(result.streakUpdate.earnedBadge);
      }

      if (result.streakUpdate?.isNewRecord) {
        notifications.showStreakRecord(result.streakUpdate.newStreak);
      }
    }
    
    onTaskUpdate();
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
    }
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  };

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center"
      >
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          今日はお疲れ様！
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          今日のタスクはありません。新しい試験を登録してスケジュールを作成しましょう。
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            今日のタスク
          </h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {completedTasks}/{totalTasks}
        </div>
      </div>

      {/* プログレスバー */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>進捗</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* タスクリスト */}
      <div className="space-y-3">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                task.completed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              {/* 紙吹雪エフェクト */}
              {confettiTasks.has(task.id) && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="confetti absolute"
                      style={{
                        left: `${20 + i * 20}%`,
                        top: '50%',
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-start space-x-3">
                {/* チェックボックス */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleTaskToggle(task.id, !task.completed)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    task.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                  }`}
                >
                  {task.completed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.button>

                {/* タスク情報 */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm">{getPriorityIcon(task.priority)}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {task.subjectName}
                    </span>
                  </div>
                  <h4 className={`font-medium ${
                    task.completed 
                      ? 'line-through text-gray-500 dark:text-gray-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {task.title}
                  </h4>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>⏱️ {task.estimatedMinutes}分</span>
                    {task.earnedExp && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        ⭐ +{task.earnedExp} EXP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 完了時のメッセージ */}
      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-center"
        >
          <div className="text-2xl mb-2">🎉</div>
          <p className="font-semibold">今日のタスクを全て完了しました！</p>
          <p className="text-sm opacity-90">素晴らしい頑張りです！</p>
        </motion.div>
      )}
    </motion.div>
  );
}