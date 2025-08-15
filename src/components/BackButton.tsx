'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function BackButton() {
  const router = useRouter();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.back()}
      className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <span className="text-xl">←</span>
      <span className="font-medium">戻る</span>
    </motion.button>
  );
}