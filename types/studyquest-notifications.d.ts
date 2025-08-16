// StudyQuest Notification System Types
// Comprehensive type definitions for gamified study management notifications

export type StudyQuestNotificationType = 
  | 'study_reminder'
  | 'exam_alert' 
  | 'streak_notification'
  | 'achievement_unlock'
  | 'schedule_update'
  | 'task_completion'
  | 'level_up'
  | 'badge_earned'
  | 'streak_warning'
  | 'exam_countdown'
  | 'daily_summary';

export interface StudyQuestNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface StudyQuestBaseNotificationData {
  type: StudyQuestNotificationType;
  url: string;
  timestamp: number;
  userId?: string;
  source: 'background-push' | 'scheduled' | 'immediate' | 'fallback';
  pushEventId?: string;
}

// 学習リマインダー通知
export interface StudyReminderData extends StudyQuestBaseNotificationData {
  type: 'study_reminder';
  timeSlot: 'morning' | 'afternoon' | 'evening';
  scheduledTime: string; // "HH:MM"
  tasksCount: number;
  streakCount: number;
  motivationalMessage?: string;
}

// 試験アラート通知
export interface ExamAlertData extends StudyQuestBaseNotificationData {
  type: 'exam_alert';
  examId: string;
  examName: string;
  examDate: string; // ISO date string
  daysUntilExam: number;
  subjects: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  preparationStatus: number; // 0-100 percentage
}

// ストリーク通知
export interface StreakNotificationData extends StudyQuestBaseNotificationData {
  type: 'streak_notification';
  subType: 'achievement' | 'warning' | 'record' | 'milestone';
  streakCount: number;
  previousRecord?: number;
  hoursUntilReset?: number; // for warning type
  milestoneLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// 実績解除通知
export interface AchievementUnlockData extends StudyQuestBaseNotificationData {
  type: 'achievement_unlock';
  achievementType: 'level_up' | 'badge_earned' | 'milestone_reached';
  title: string;
  description: string;
  newLevel?: number;
  badgeId?: string;
  expGained?: number;
  celebrationLevel: 'normal' | 'special' | 'legendary';
}

// スケジュール更新通知
export interface ScheduleUpdateData extends StudyQuestBaseNotificationData {
  type: 'schedule_update';
  updateType: 'auto_generated' | 'manual_update' | 'adjustment' | 'conflict_resolved';
  affectedExams: string[];
  newTasksCount: number;
  adjustmentReason?: string;
  priority: 'low' | 'medium' | 'high';
}

// タスク完了通知
export interface TaskCompletionData extends StudyQuestBaseNotificationData {
  type: 'task_completion';
  taskId: string;
  taskTitle: string;
  subjectName: string;
  expGained: number;
  completionTime: number; // minutes
  isEarlyCompletion: boolean;
  newTotalExp: number;
  streakMaintained: boolean;
}

// レベルアップ通知
export interface LevelUpData extends StudyQuestBaseNotificationData {
  type: 'level_up';
  newLevel: number;
  previousLevel: number;
  totalExp: number;
  expUntilNextLevel: number;
  unlockedFeatures?: string[];
  celebrationAnimation: 'standard' | 'special' | 'legendary';
}

// バッジ獲得通知
export interface BadgeEarnedData extends StudyQuestBaseNotificationData {
  type: 'badge_earned';
  badgeId: string;
  badgeName: string;
  badgeDescription: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: string;
  earnedDate: string;
}

// ストリーク警告通知
export interface StreakWarningData extends StudyQuestBaseNotificationData {
  type: 'streak_warning';
  currentStreak: number;
  hoursRemaining: number;
  lastStudyTime: string;
  urgencyLevel: 'early' | 'moderate' | 'urgent' | 'critical';
  quickActions: string[];
}

// 試験カウントダウン通知
export interface ExamCountdownData extends StudyQuestBaseNotificationData {
  type: 'exam_countdown';
  examId: string;
  examName: string;
  daysRemaining: number;
  hoursRemaining?: number;
  preparationStatus: number; // 0-100 percentage
  criticalSubjects: string[];
  recommendedActions: string[];
}

// 日次サマリー通知
export interface DailySummaryData extends StudyQuestBaseNotificationData {
  type: 'daily_summary';
  date: string;
  tasksCompleted: number;
  totalTasks: number;
  expGained: number;
  streakMaintained: boolean;
  studyTimeMinutes: number;
  achievements: string[];
  tomorrowTasks: number;
}

// Union type for all notification data
export type StudyQuestNotificationData = 
  | StudyReminderData
  | ExamAlertData
  | StreakNotificationData
  | AchievementUnlockData
  | ScheduleUpdateData
  | TaskCompletionData
  | LevelUpData
  | BadgeEarnedData
  | StreakWarningData
  | ExamCountdownData
  | DailySummaryData;

// Complete notification payload structure
export interface StudyQuestNotificationPayload {
  title: string;
  body: string;
  icon: string;
  badge?: string;
  image?: string;
  tag: string;
  requireInteraction: boolean;
  silent: false; // Always false for iOS compatibility
  vibrate?: number[];
  renotify?: boolean;
  timestamp?: number;
  data: StudyQuestNotificationData;
  actions?: StudyQuestNotificationAction[];
  dir?: 'ltr' | 'rtl';
  lang?: string;
}

// Notification routing configuration
export interface StudyQuestNotificationRoute {
  type: StudyQuestNotificationType;
  defaultPath: string;
  queryParams?: Record<string, string>;
  requiresAuth?: boolean;
  preloadData?: boolean;
}

// Notification subscription with StudyQuest metadata
export interface StudyQuestPushSubscription extends PushSubscription {
  metadata?: {
    userId?: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux';
    browserType: 'safari' | 'chrome' | 'firefox' | 'edge' | 'other';
    subscriptionDate: string;
    lastUsed: string;
    notificationPreferences: {
      studyReminders: boolean;
      examAlerts: boolean;
      streakNotifications: boolean;
      achievements: boolean;
      scheduleUpdates: boolean;
    };
    timeZone: string;
    language: string;
  };
}

// Service Worker message types for StudyQuest
export interface StudyQuestServiceWorkerMessage {
  type: 'SKIP_WAITING' 
    | 'TEST_NOTIFICATION' 
    | 'CHECK_PERMISSION' 
    | 'SCHEDULE_NOTIFICATIONS' 
    | 'IOS_PWA_CHECK'
    | 'NOTIFICATION_DISPLAYED'
    | 'NAVIGATE_TO'
    | 'GET_SILENT_PUSH_COUNT'
    | 'UPDATE_NOTIFICATION_PREFERENCES'
    | 'CLEAR_CACHE'
    | 'SYNC_OFFLINE_DATA'
    | 'STUDYQUEST_NAVIGATE'
    | 'STUDYQUEST_ACTION';
  payload?: any;
  notificationType?: StudyQuestNotificationType;
  url?: string;
  message?: string;
  settings?: any;
  action?: string;
}

// Error types for notification system
export interface StudyQuestNotificationError {
  code: 'PERMISSION_DENIED' 
    | 'SUBSCRIPTION_FAILED' 
    | 'SEND_FAILED' 
    | 'INVALID_PAYLOAD' 
    | 'SERVICE_WORKER_ERROR'
    | 'IOS_SILENT_PUSH_LIMIT'
    | 'NETWORK_ERROR'
    | 'QUOTA_EXCEEDED';
  message: string;
  details?: any;
  timestamp: number;
  recoverable: boolean;
  suggestedAction?: string;
}

// Analytics/Tracking for notifications
export interface StudyQuestNotificationAnalytics {
  notificationId: string;
  type: StudyQuestNotificationType;
  sentAt: number;
  deliveredAt?: number;
  clickedAt?: number;
  dismissedAt?: number;
  action?: string;
  platform: string;
  successful: boolean;
  errorCode?: string;
  userEngaged: boolean;
}

// Configuration for notification scheduling
export interface StudyQuestNotificationScheduleConfig {
  userId: string;
  timezone: string;
  studyReminders: {
    enabled: boolean;
    morning?: string; // "HH:MM"
    afternoon?: string;
    evening?: string;
  };
  examAlerts: {
    enabled: boolean;
    daysBeforeExam: number[];
    urgentHours: number;
  };
  streakNotifications: {
    enabled: boolean;
    warningHours: number;
    achievementMilestones: number[];
  };
  achievements: {
    enabled: boolean;
    levelUps: boolean;
    badges: boolean;
    milestones: boolean;
  };
  scheduleUpdates: {
    enabled: boolean;
    autoGeneration: boolean;
    conflicts: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "HH:MM"
    end: string; // "HH:MM"
  };
}

export default StudyQuestNotificationPayload;