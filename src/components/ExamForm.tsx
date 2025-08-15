'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

const examSchema = z.object({
  name: z.string().min(1, '試験名を入力してください'),
  date: z.string().min(1, '試験日を選択してください'),
  subjects: z.array(z.object({
    name: z.string().min(1, '教科名を入力してください'),
    range: z.string().min(1, '試験範囲を入力してください'),
    workbookPages: z.number().min(1, '問題集のページ数を入力してください'),
  })).min(1, '最低1つの教科を追加してください'),
});

type ExamFormData = z.infer<typeof examSchema>;

const defaultSubjects = [
  { name: '数学', range: '', workbookPages: 50 },
  { name: '英語', range: '', workbookPages: 40 },
  { name: '国語', range: '', workbookPages: 30 },
  { name: '理科', range: '', workbookPages: 45 },
  { name: '社会', range: '', workbookPages: 40 },
];

interface ExamFormProps {
  onSubmit: (data: ExamFormData) => void;
}

export function ExamForm({ onSubmit }: ExamFormProps) {
  const [subjects, setSubjects] = useState([defaultSubjects[0]]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      name: '',
      date: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      subjects: [defaultSubjects[0]],
    },
  });

  const addSubject = () => {
    const availableSubjects = defaultSubjects.filter(
      defaultSubject => !subjects.some(subject => subject.name === defaultSubject.name)
    );
    
    if (availableSubjects.length > 0) {
      const newSubjects = [...subjects, availableSubjects[0]];
      setSubjects(newSubjects);
      setValue('subjects', newSubjects);
    }
  };

  const removeSubject = (index: number) => {
    if (subjects.length > 1) {
      const newSubjects = subjects.filter((_, i) => i !== index);
      setSubjects(newSubjects);
      setValue('subjects', newSubjects);
    }
  };

  const updateSubject = (index: number, field: keyof typeof subjects[0], value: string | number) => {
    const newSubjects = subjects.map((subject, i) => 
      i === index ? { ...subject, [field]: value } : subject
    );
    setSubjects(newSubjects);
    setValue('subjects', newSubjects);
  };

  const onFormSubmit = (data: ExamFormData) => {
    setIsLoading(true);
    
    // LocalStorageに試験情報を保存
    const exams = JSON.parse(localStorage.getItem('studyquest_exams') || '[]');
    const newExam = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('studyquest_exams', JSON.stringify([...exams, newExam]));
    
    // スケジュールを生成してLocalStorageに保存
    const { generateSchedule } = require('@/lib/scheduleGenerator');
    const tasks = generateSchedule(newExam);
    const existingTasks = JSON.parse(localStorage.getItem('studyquest_tasks') || '[]');
    localStorage.setItem('studyquest_tasks', JSON.stringify([...existingTasks, ...tasks]));
    
    setTimeout(() => {
      onSubmit(data);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          試験名
        </label>
        <input
          {...register('name')}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="例: 第1回定期試験"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          試験日
        </label>
        <input
          {...register('date')}
          type="date"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            教科・試験範囲
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={addSubject}
            disabled={subjects.length >= 5}
            className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➕ 教科追加
          </motion.button>
        </div>

        <AnimatePresence>
          {subjects.map((subject, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center justify-between mb-3">
                <select
                  value={subject.name}
                  onChange={(e) => updateSubject(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {defaultSubjects.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {subjects.length > 1 && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => removeSubject(index)}
                    className="ml-2 text-red-500 hover:text-red-700 text-xl"
                  >
                    🗑️
                  </motion.button>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    試験範囲
                  </label>
                  <textarea
                    value={subject.range}
                    onChange={(e) => updateSubject(index, 'range', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={2}
                    placeholder="例: 教科書p.50-80, ワークp.20-40"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    問題集ページ数
                  </label>
                  <input
                    type="number"
                    value={subject.workbookPages}
                    onChange={(e) => updateSubject(index, 'workbookPages', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    placeholder="50"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>作成中...</span>
          </div>
        ) : (
          '✨ スケジュールを自動作成'
        )}
      </motion.button>
    </form>
  );
}