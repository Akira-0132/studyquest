import { addDays, differenceInDays, format, parseISO } from 'date-fns';

export interface Subject {
  name: string;
  range: string;
  workbookPages: number;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  subjects: Subject[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  subjectName: string;
  scheduledDate: string;
  completed: boolean;
  completedAt?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  earnedExp?: number;
  examId: string;
  type: 'study' | 'review' | 'final_review';
}

const DAILY_STUDY_HOURS = 2; // デフォルト1日2時間
const MINUTES_PER_HOUR = 60;
const DAILY_STUDY_MINUTES = DAILY_STUDY_HOURS * MINUTES_PER_HOUR;

export function generateSchedule(exam: Exam): Task[] {
  const tasks: Task[] = [];
  const examDate = parseISO(exam.date);
  const today = new Date();
  const daysUntilExam = differenceInDays(examDate, today);
  
  // 試験まで5日未満の場合は緊急モード
  const isUrgentMode = daysUntilExam < 5;
  const studyDays = Math.max(daysUntilExam - 1, 1); // 最低1日は確保
  
  // 各教科の総学習時間を計算（問題集ページ数 × 3分/ページ）
  const subjectStudyPlans = exam.subjects.map(subject => {
    const totalMinutes = subject.workbookPages * 3; // 1ページ3分
    const dailyMinutes = Math.ceil(totalMinutes / studyDays);
    const reviewDays = Math.min(3, Math.floor(studyDays / 3)); // 復習日数
    
    return {
      subject,
      totalMinutes,
      dailyMinutes,
      reviewDays,
      studyDays: studyDays - reviewDays,
    };
  });
  
  // 1日あたりの総勉強時間を調整
  const totalDailyMinutes = subjectStudyPlans.reduce((sum, plan) => sum + plan.dailyMinutes, 0);
  const adjustmentRatio = totalDailyMinutes > DAILY_STUDY_MINUTES 
    ? DAILY_STUDY_MINUTES / totalDailyMinutes 
    : 1;
  
  // 教科ごとのタスクを生成
  subjectStudyPlans.forEach((plan, subjectIndex) => {
    const adjustedDailyMinutes = Math.ceil(plan.dailyMinutes * adjustmentRatio);
    
    // 通常の学習タスク
    for (let day = 0; day < plan.studyDays; day++) {
      const taskDate = addDays(today, day);
      
      // 日付が試験日を超えないようにチェック
      if (differenceInDays(examDate, taskDate) <= 0) break;
      
      const progress = (day + 1) / plan.studyDays;
      const startPage = Math.floor(day * (plan.subject.workbookPages / plan.studyDays)) + 1;
      const endPage = Math.min(
        Math.floor((day + 1) * (plan.subject.workbookPages / plan.studyDays)),
        plan.subject.workbookPages
      );
      
      tasks.push({
        id: `${exam.id}-${subjectIndex}-study-${day}`,
        title: `${plan.subject.name} p.${startPage}-${endPage}`,
        subjectName: plan.subject.name,
        scheduledDate: format(taskDate, 'yyyy-MM-dd'),
        completed: false,
        priority: progress > 0.8 ? 'high' : progress > 0.4 ? 'medium' : 'low',
        estimatedMinutes: adjustedDailyMinutes,
        examId: exam.id,
        type: 'study',
      });
    }
    
    // 復習タスク
    for (let reviewDay = 0; reviewDay < plan.reviewDays; reviewDay++) {
      const reviewDate = addDays(today, plan.studyDays + reviewDay);
      
      // 日付が試験日を超えないようにチェック
      if (differenceInDays(examDate, reviewDate) <= 0) break;
      
      tasks.push({
        id: `${exam.id}-${subjectIndex}-review-${reviewDay}`,
        title: `${plan.subject.name} 復習 (全範囲)`,
        subjectName: plan.subject.name,
        scheduledDate: format(reviewDate, 'yyyy-MM-dd'),
        completed: false,
        priority: 'high',
        estimatedMinutes: Math.ceil(adjustedDailyMinutes * 0.7), // 復習は70%の時間
        examId: exam.id,
        type: 'review',
      });
    }
  });
  
  // 最終日の総復習タスク
  const finalReviewDate = addDays(examDate, -1);
  if (differenceInDays(finalReviewDate, today) >= 0) {
    exam.subjects.forEach((subject, index) => {
      tasks.push({
        id: `${exam.id}-${index}-final-review`,
        title: `${subject.name} 最終確認`,
        subjectName: subject.name,
        scheduledDate: format(finalReviewDate, 'yyyy-MM-dd'),
        completed: false,
        priority: 'high',
        estimatedMinutes: 30,
        examId: exam.id,
        type: 'final_review',
      });
    });
  }
  
  // タスクを日付順でソート
  return tasks.sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
}

export function getTodayTasks(): Task[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = JSON.parse(localStorage.getItem('studyquest_tasks') || '[]') as Task[];
  return tasks.filter(task => task.scheduledDate === today);
}

export function getAllTasks(): Task[] {
  return JSON.parse(localStorage.getItem('studyquest_tasks') || '[]') as Task[];
}

export function updateTaskCompletion(taskId: string, completed: boolean): {
  leveledUp: boolean;
  newLevel?: number;
  streakUpdate?: {
    newStreak: number;
    isNewRecord: boolean;
    earnedBadge?: string;
  };
} {
  const tasks = getAllTasks();
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    return { leveledUp: false };
  }

  const exp = completed ? calculateExp(task) : 0;
  const updatedTasks = tasks.map(t => 
    t.id === taskId 
      ? { 
          ...t, 
          completed, 
          completedAt: completed ? new Date().toISOString() : undefined,
          earnedExp: completed ? exp : undefined,
        }
      : t
  );
  localStorage.setItem('studyquest_tasks', JSON.stringify(updatedTasks));
  
  if (completed) {
    // 経験値を追加
    const { addExperiencePoints, updateStreakOnTaskCompletion } = require('@/lib/streakManager');
    const expResult = addExperiencePoints(exp);
    const streakResult = updateStreakOnTaskCompletion();
    
    return {
      leveledUp: expResult.leveledUp,
      newLevel: expResult.newLevel,
      streakUpdate: {
        newStreak: streakResult.newStreak,
        isNewRecord: streakResult.isNewRecord,
        earnedBadge: streakResult.earnedBadge,
      },
    };
  }

  return { leveledUp: false };
}

function calculateExp(task: Task): number {
  let baseExp = 10;
  
  // 優先度による経験値調整
  if (task.priority === 'high') baseExp += 10;
  else if (task.priority === 'medium') baseExp += 5;
  
  // タスクタイプによる経験値調整
  if (task.type === 'final_review') baseExp += 15;
  else if (task.type === 'review') baseExp += 5;
  
  // 時間による経験値調整
  if (task.estimatedMinutes > 60) baseExp += 10;
  
  return baseExp;
}

