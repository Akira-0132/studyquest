'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const actions = [
  {
    icon: '📝',
    title: '試験登録',
    description: '新しい試験情報を登録',
    href: '/exam/new',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: '📅',
    title: 'スケジュール',
    description: '全体の学習計画を確認',
    href: '/schedule',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: '⚙️',
    title: '設定',
    description: '通知やアプリの設定',
    href: '/settings',
    color: 'from-purple-500 to-pink-600',
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">⚡</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          クイックアクション
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Link href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl bg-gradient-to-r ${action.color} text-white cursor-pointer hover:shadow-lg transition-shadow duration-200`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{action.icon}</div>
                  <div>
                    <h4 className="font-semibold">{action.title}</h4>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xl">→</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}