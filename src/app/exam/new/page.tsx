'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExamForm } from '@/components/ExamForm';
import { BackButton } from '@/components/BackButton';

export default function NewExamPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFormSubmit = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-white"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="text-6xl mb-4"
          >
            ✨
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">試験が登録されました！</h2>
          <p className="text-lg opacity-90">スケジュールを作成中...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 px-4 py-6">
      <div className="max-w-md mx-auto">
        <BackButton />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mt-4"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📝</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              試験情報を登録
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              試験日と範囲を入力して、自動でスケジュールを作成しましょう
            </p>
          </div>
          <ExamForm onSubmit={handleFormSubmit} />
        </motion.div>
      </div>
    </div>
  );
}