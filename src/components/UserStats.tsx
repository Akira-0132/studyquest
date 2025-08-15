'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getUserData, type UserData } from '@/lib/streakManager';

export function UserStats() {
  const [userData, setUserData] = useState<UserData>({
    level: 1,
    exp: 0,
    currentStreak: 0,
    maxStreak: 0,
    streakProtection: 0,
    totalTasksCompleted: 0,
    badges: [],
  });

  useEffect(() => {
    setUserData(getUserData());
  }, []);

  const expToNextLevel = 100 - (userData.exp % 100);
  const levelProgress = (userData.exp % 100) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* レベルと経験値 */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⭐</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                レベル {userData.level}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              次まで {expToNextLevel} EXP
            </span>
          </div>
          
          {/* プログレスバー */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          
          <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
            {userData.exp} EXP
          </div>
        </div>

        {/* 現在のストリーク */}
        <div className="bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl p-4">
          <div className="text-center">
            <motion.div
              animate={{ 
                scale: userData.currentStreak > 0 ? [1, 1.1, 1] : 1 
              }}
              transition={{ 
                duration: 0.5, 
                repeat: userData.currentStreak > 0 ? Infinity : 0,
                repeatDelay: 2 
              }}
              className="text-3xl mb-1"
            >
              🔥
            </motion.div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {userData.currentStreak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              連続日数
            </div>
          </div>
        </div>

        {/* 最大ストリーク */}
        <div className="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl p-4">
          <div className="text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {userData.maxStreak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              最大記録
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}