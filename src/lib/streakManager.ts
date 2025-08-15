import { format, differenceInDays, parseISO, isToday, isYesterday } from 'date-fns';

export interface UserData {
  level: number;
  exp: number;
  currentStreak: number;
  maxStreak: number;
  lastStudyDate?: string;
  streakProtection: number; // 保護券の数
  totalTasksCompleted: number;
  badges: string[];
}

export function getUserData(): UserData {
  const defaultData: UserData = {
    level: 1,
    exp: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastStudyDate: undefined,
    streakProtection: 1, // 初回1枚
    totalTasksCompleted: 0,
    badges: [],
  };

  const saved = localStorage.getItem('studyquest_user');
  if (!saved) {
    localStorage.setItem('studyquest_user', JSON.stringify(defaultData));
    return defaultData;
  }

  return { ...defaultData, ...JSON.parse(saved) };
}

export function updateUserData(data: Partial<UserData>): UserData {
  const currentData = getUserData();
  const newData = { ...currentData, ...data };
  localStorage.setItem('studyquest_user', JSON.stringify(newData));
  return newData;
}

export function updateStreakOnTaskCompletion(): { 
  newStreak: number; 
  isNewRecord: boolean; 
  earnedBadge?: string;
  leveledUp: boolean;
  newLevel?: number;
} {
  const userData = getUserData();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTasks = JSON.parse(localStorage.getItem('studyquest_tasks') || '[]')
    .filter((task: any) => task.scheduledDate === today);
  
  // 今日完了したタスクがあるかチェック
  const completedTodayTasks = todayTasks.filter((task: any) => task.completed);
  
  if (completedTodayTasks.length === 0) {
    // まだ今日のタスクが完了していない
    return { 
      newStreak: userData.currentStreak, 
      isNewRecord: false, 
      leveledUp: false 
    };
  }

  let newStreak = userData.currentStreak;
  let isNewRecord = false;
  let earnedBadge: string | undefined;

  // ストリーク計算
  if (!userData.lastStudyDate) {
    // 初回
    newStreak = 1;
  } else {
    const lastStudyDate = parseISO(userData.lastStudyDate);
    
    if (isToday(lastStudyDate)) {
      // 今日既に勉強済み（ストリーク変化なし）
      return { 
        newStreak: userData.currentStreak, 
        isNewRecord: false, 
        leveledUp: false 
      };
    } else if (isYesterday(lastStudyDate)) {
      // 昨日から継続
      newStreak = userData.currentStreak + 1;
    } else {
      // ストリークが途切れた
      newStreak = 1;
    }
  }

  // 最大記録更新チェック
  if (newStreak > userData.maxStreak) {
    isNewRecord = true;
  }

  // バッジチェック
  const badges = [...userData.badges];
  if (newStreak >= 3 && !badges.includes('bronze_streak')) {
    badges.push('bronze_streak');
    earnedBadge = '🥉 3日連続達成！';
  } else if (newStreak >= 7 && !badges.includes('silver_streak')) {
    badges.push('silver_streak');
    earnedBadge = '🥈 1週間連続達成！';
  } else if (newStreak >= 14 && !badges.includes('gold_streak')) {
    badges.push('gold_streak');
    earnedBadge = '🥇 2週間連続達成！';
  } else if (newStreak >= 30 && !badges.includes('platinum_streak')) {
    badges.push('platinum_streak');
    earnedBadge = '💎 1ヶ月連続達成！';
  }

  // レベルアップチェック
  const oldLevel = userData.level;
  const newLevel = Math.floor(userData.exp / 100) + 1;
  const leveledUp = newLevel > oldLevel;

  // データ更新
  const updatedData = updateUserData({
    currentStreak: newStreak,
    maxStreak: Math.max(newStreak, userData.maxStreak),
    lastStudyDate: today,
    badges,
    totalTasksCompleted: userData.totalTasksCompleted + 1,
    level: newLevel,
  });

  return { 
    newStreak, 
    isNewRecord, 
    earnedBadge, 
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
  };
}

export function addExperiencePoints(points: number): {
  leveledUp: boolean;
  newLevel?: number;
  newExp: number;
} {
  const userData = getUserData();
  const newExp = userData.exp + points;
  const oldLevel = userData.level;
  const newLevel = Math.floor(newExp / 100) + 1;
  const leveledUp = newLevel > oldLevel;

  updateUserData({
    exp: newExp,
    level: newLevel,
  });

  return {
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    newExp,
  };
}

export function useStreakProtection(): boolean {
  const userData = getUserData();
  
  if (userData.streakProtection <= 0) {
    return false;
  }

  // 保護券を使用
  updateUserData({
    streakProtection: userData.streakProtection - 1,
    lastStudyDate: format(new Date(), 'yyyy-MM-dd'), // 今日勉強したことにする
  });

  return true;
}

export function checkStreakStatus(): {
  isAtRisk: boolean; // ストリークが危険な状態
  hoursLeft: number; // 残り時間
} {
  const userData = getUserData();
  
  if (!userData.lastStudyDate) {
    return { isAtRisk: false, hoursLeft: 24 };
  }

  const lastStudyDate = parseISO(userData.lastStudyDate);
  const now = new Date();
  const hoursSinceLastStudy = (now.getTime() - lastStudyDate.getTime()) / (1000 * 60 * 60);
  
  const isAtRisk = hoursSinceLastStudy >= 23; // 23時間経過で警告
  const hoursLeft = Math.max(0, 24 - hoursSinceLastStudy);

  return { isAtRisk, hoursLeft };
}