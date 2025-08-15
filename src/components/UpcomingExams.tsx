'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Exam } from '@/lib/scheduleGenerator';

export function UpcomingExams() {
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const savedExams = JSON.parse(localStorage.getItem('studyquest_exams') || '[]') as Exam[];
    const now = new Date();
    
    // 今後の試験のみをフィルタリングし、日付順でソート
    const upcomingExams = savedExams
      .filter(exam => parseISO(exam.date) > now)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 3); // 最大3件まで表示
    
    setExams(upcomingExams);
  }, []);

  if (exams.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center"
      >
        <div className="text-4xl mb-3">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          今後の試験
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          試験が登録されていません。新しい試験を登録してスケジュールを作成しましょう。
        </p>
      </motion.div>
    );
  }

  const getDaysUntilExam = (examDate: string) => {
    const days = differenceInDays(parseISO(examDate), new Date());
    if (days === 0) return '今日';
    if (days === 1) return '明日';
    return `${days}日後`;
  };

  const getUrgencyColor = (examDate: string) => {
    const days = differenceInDays(parseISO(examDate), new Date());
    if (days <= 3) return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    if (days <= 7) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
  };

  const getUrgencyIcon = (examDate: string) => {
    const days = differenceInDays(parseISO(examDate), new Date());
    if (days <= 3) return '🔥';
    if (days <= 7) return '⚡';
    return '📚';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">📅</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          今後の試験
        </h3>
      </div>

      <div className="space-y-3">
        {exams.map((exam, index) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className={`p-4 rounded-xl border-2 ${getUrgencyColor(exam.date)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{getUrgencyIcon(exam.date)}</span>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {exam.name}
                  </h4>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {format(parseISO(exam.date), 'M月d日(E)', { locale: ja })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {exam.subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    >
                      {subject.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {getDaysUntilExam(exam.date)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}