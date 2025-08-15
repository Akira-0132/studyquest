'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastNotification {
  id: string;
  type: 'levelUp' | 'badge' | 'streak' | 'achievement';
  title: string;
  message: string;
  icon: string;
  duration?: number;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  useEffect(() => {
    notifications.forEach(notification => {
      const duration = notification.duration || 4000;
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, duration);

      return () => clearTimeout(timer);
    });
  }, [notifications, onDismiss]);

  const getGradient = (type: ToastNotification['type']) => {
    switch (type) {
      case 'levelUp':
        return 'from-yellow-400 to-orange-500';
      case 'badge':
        return 'from-purple-400 to-pink-500';
      case 'streak':
        return 'from-red-400 to-orange-500';
      case 'achievement':
        return 'from-green-400 to-blue-500';
      default:
        return 'from-indigo-400 to-purple-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`bg-gradient-to-r ${getGradient(notification.type)} rounded-2xl p-4 text-white shadow-lg max-w-sm cursor-pointer`}
            onClick={() => onDismiss(notification.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start space-x-3">
              <motion.div
                animate={{ 
                  rotate: notification.type === 'levelUp' ? [0, 10, -10, 0] : 0,
                  scale: notification.type === 'badge' ? [1, 1.2, 1] : 1,
                }}
                transition={{ 
                  duration: notification.type === 'levelUp' ? 0.5 : 0.3,
                  repeat: notification.type === 'badge' ? 2 : 0,
                }}
                className="text-2xl"
              >
                {notification.icon}
              </motion.div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{notification.title}</h4>
                <p className="text-sm opacity-90 mt-1">{notification.message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(notification.id);
                }}
                className="text-white/70 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}