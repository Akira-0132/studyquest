'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BackButton } from '@/components/BackButton';
import { ClientOnly } from '@/components/ClientOnly';
import { getAllTasks, type Task } from '@/lib/scheduleGenerator';

export default function SchedulePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    setTasks(getAllTasks());
  }, []);

  // 今週の日付を取得
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // 月曜日開始
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 日付別のタスクをグループ化
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = task.scheduledDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    }
  };

  const getCompletionStats = (dayTasks: Task[]) => {
    const completed = dayTasks.filter(task => task.completed).length;
    const total = dayTasks.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <BackButton />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📅</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              学習スケジュール
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              今週の予定と進捗を確認しましょう
            </p>
          </div>

          {/* 週表示 */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dateStr] || [];
              const stats = getCompletionStats(dayTasks);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <motion.div
                  key={dateStr}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-xl border-2 ${
                    isToday 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {format(day, 'E', { locale: ja })}
                    </div>
                    <div className={`text-lg font-bold ${
                      isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    {dayTasks.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {stats.completed}/{stats.total}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 今日の詳細タスク */}
          <ClientOnly fallback={
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          }>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {format(new Date(), 'M月d日(E)', { locale: ja })}の予定
            </h3>
            
            {(() => {
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const todayTasks = tasksByDate[todayStr] || [];
              
              if (todayTasks.length === 0) {
                return (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-gray-600 dark:text-gray-400">
                      今日の予定はありません
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {todayTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border-2 ${getPriorityColor(task.priority)} ${
                        task.completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          task.completed 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {task.completed && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              {task.subjectName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {task.estimatedMinutes}分
                            </span>
                          </div>
                          <h4 className={`font-medium ${
                            task.completed 
                              ? 'line-through text-gray-500 dark:text-gray-400' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {task.title}
                          </h4>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
            </div>
          </ClientOnly>
        </motion.div>
      </div>
    </div>
  );
}