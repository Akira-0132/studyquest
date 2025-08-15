'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  {
    href: '/',
    icon: '🏠',
    label: 'ホーム',
  },
  {
    href: '/schedule',
    icon: '📅',
    label: 'スケジュール',
  },
  {
    href: '/exam/new',
    icon: '➕',
    label: '試験登録',
  },
  {
    href: '/settings',
    icon: '⚙️',
    label: '設定',
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center p-2 rounded-lg transition-colors duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <div className="relative z-10">
                <span className={`text-xl ${isActive ? 'filter drop-shadow-lg' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-xs mt-1 block font-medium ${
                  isActive 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}