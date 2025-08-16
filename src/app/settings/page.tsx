'use client';

import { motion } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import { ClientOnly } from '@/components/ClientOnly';

export default function SettingsPage() {
  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-4">
        <div className="max-w-md mx-auto">
          <BackButton />
          
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ⚙️ 設定
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                通知設定とアカウント情報
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                🔔 バックグラウンド通知
              </h2>
              
              <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  アプリが閉じていても指定時刻に学習リマインダーが届きます
                </p>
                
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  🚀 バックグラウンド通知を有効にする
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                📊 ユーザー統計
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    1
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">レベル</div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    0
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">連続日数</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ClientOnly>
  );
}