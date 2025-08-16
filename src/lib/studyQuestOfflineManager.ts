// StudyQuest Offline Data Management System
// Comprehensive offline support for core StudyQuest features

import type { StudyQuestNotificationScheduleConfig } from '../../types/studyquest-notifications';

// StudyQuest Data Types for Offline Storage
interface StudyQuestOfflineData {
  exams: ExamData[];
  tasks: TaskData[];
  userProgress: UserProgressData;
  streakData: StreakData;
  notificationSettings: StudyQuestNotificationScheduleConfig;
  lastSyncTimestamp: number;
  version: string;
}

interface ExamData {
  id: string;
  name: string;
  date: string;
  subjects: SubjectData[];
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

interface SubjectData {
  id: string;
  name: string;
  range: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  completedTasks: number;
  totalTasks: number;
}

interface TaskData {
  id: string;
  examId: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  syncStatus: 'synced' | 'pending' | 'conflict';
}

interface UserProgressData {
  level: number;
  totalExp: number;
  expToNextLevel: number;
  badges: BadgeData[];
  achievements: AchievementData[];
  statistics: UserStatistics;
}

interface BadgeData {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AchievementData {
  id: string;
  title: string;
  description: string;
  type: 'streak' | 'completion' | 'speed' | 'consistency';
  unlockedAt: string;
  progress: number;
  maxProgress: number;
}

interface UserStatistics {
  totalStudyTime: number; // minutes
  tasksCompleted: number;
  examsCompleted: number;
  averageSessionTime: number;
  mostProductiveHour: number;
  studyStreak: number;
  longestStreak: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  streakStartDate: string;
  streakHistory: StreakEntry[];
}

interface StreakEntry {
  date: string;
  studyTime: number;
  tasksCompleted: number;
  maintained: boolean;
}

// StudyQuest Offline Manager Class
class StudyQuestOfflineManager {
  private static instance: StudyQuestOfflineManager;
  private dbName = 'studyquest-offline-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private syncQueue: Array<SyncOperation> = [];

  private constructor() {}

  static getInstance(): StudyQuestOfflineManager {
    if (!StudyQuestOfflineManager.instance) {
      StudyQuestOfflineManager.instance = new StudyQuestOfflineManager();
    }
    return StudyQuestOfflineManager.instance;
  }

  // Initialize IndexedDB for StudyQuest
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          console.error('❌ StudyQuest IndexedDB initialization failed');
          reject(false);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isInitialized = true;
          console.log('✅ StudyQuest IndexedDB initialized');
          resolve(true);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object stores for StudyQuest data
          this.createStudyQuestStores(db);
        };
      });
    } catch (error) {
      console.error('❌ StudyQuest offline manager initialization failed:', error);
      return false;
    }
  }

  // Create IndexedDB stores for StudyQuest
  private createStudyQuestStores(db: IDBDatabase): void {
    // Exams store
    if (!db.objectStoreNames.contains('exams')) {
      const examStore = db.createObjectStore('exams', { keyPath: 'id' });
      examStore.createIndex('date', 'date');
      examStore.createIndex('syncStatus', 'syncStatus');
    }

    // Tasks store
    if (!db.objectStoreNames.contains('tasks')) {
      const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
      taskStore.createIndex('examId', 'examId');
      taskStore.createIndex('dueDate', 'dueDate');
      taskStore.createIndex('completed', 'completed');
      taskStore.createIndex('syncStatus', 'syncStatus');
    }

    // User progress store
    if (!db.objectStoreNames.contains('userProgress')) {
      db.createObjectStore('userProgress', { keyPath: 'id' });
    }

    // Streak data store
    if (!db.objectStoreNames.contains('streakData')) {
      db.createObjectStore('streakData', { keyPath: 'id' });
    }

    // Settings store
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains('syncQueue')) {
      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      syncStore.createIndex('timestamp', 'timestamp');
      syncStore.createIndex('priority', 'priority');
    }

    console.log('📊 StudyQuest IndexedDB stores created');
  }

  // Save exam data offline
  async saveExamOffline(exam: ExamData): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['exams'], 'readwrite');
        const store = transaction.objectStore('exams');
        
        exam.syncStatus = 'pending';
        exam.updatedAt = new Date().toISOString();
        
        const request = store.put(exam);
        
        request.onsuccess = () => {
          console.log('✅ Exam saved offline:', exam.id);
          this.addToSyncQueue({
            type: 'exam',
            operation: 'update',
            data: exam,
            priority: 'medium'
          });
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('❌ Failed to save exam offline:', exam.id);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Save exam offline error:', error);
      return false;
    }
  }

  // Save task data offline
  async saveTaskOffline(task: TaskData): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        task.syncStatus = 'pending';
        
        const request = store.put(task);
        
        request.onsuccess = () => {
          console.log('✅ Task saved offline:', task.id);
          this.addToSyncQueue({
            type: 'task',
            operation: task.completed ? 'complete' : 'update',
            data: task,
            priority: task.completed ? 'high' : 'medium'
          });
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('❌ Failed to save task offline:', task.id);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Save task offline error:', error);
      return false;
    }
  }

  // Update user progress offline
  async updateUserProgressOffline(progress: UserProgressData): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['userProgress'], 'readwrite');
        const store = transaction.objectStore('userProgress');
        
        const progressData = { id: 'current', ...progress, updatedAt: new Date().toISOString() };
        const request = store.put(progressData);
        
        request.onsuccess = () => {
          console.log('✅ User progress updated offline');
          this.addToSyncQueue({
            type: 'progress',
            operation: 'update',
            data: progress,
            priority: 'low'
          });
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('❌ Failed to update user progress offline');
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Update user progress offline error:', error);
      return false;
    }
  }

  // Update streak data offline
  async updateStreakOffline(streakData: StreakData): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['streakData'], 'readwrite');
        const store = transaction.objectStore('streakData');
        
        const data = { id: 'current', ...streakData, updatedAt: new Date().toISOString() };
        const request = store.put(data);
        
        request.onsuccess = () => {
          console.log('✅ Streak data updated offline');
          this.addToSyncQueue({
            type: 'streak',
            operation: 'update',
            data: streakData,
            priority: 'high' // Streaks are important for gamification
          });
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('❌ Failed to update streak data offline');
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Update streak offline error:', error);
      return false;
    }
  }

  // Get offline data
  async getOfflineData<T>(storeName: string, key?: string): Promise<T | T[] | null> {
    if (!this.db) await this.initialize();
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        let request: IDBRequest;
        
        if (key) {
          request = store.get(key);
        } else {
          request = store.getAll();
        }
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error(`❌ Failed to get offline data from ${storeName}`);
          reject(null);
        };
      });
    } catch (error) {
      console.error('❌ Get offline data error:', error);
      return null;
    }
  }

  // Add operation to sync queue
  private async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) return;
    
    const syncOperation: SyncOperation = {
      ...operation,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    };
    
    try {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.add(syncOperation);
      
      console.log('📤 Added to sync queue:', syncOperation.type, syncOperation.operation);
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
    }
  }

  // Sync offline data when online
  async syncOfflineData(): Promise<{ success: number; failed: number }> {
    if (!navigator.onLine) {
      console.log('⚠️ Cannot sync: offline');
      return { success: 0, failed: 0 };
    }

    console.log('🔄 Starting StudyQuest offline data sync...');
    
    const queue = await this.getSyncQueue();
    let success = 0;
    let failed = 0;

    for (const operation of queue) {
      try {
        const result = await this.executeSyncOperation(operation);
        if (result) {
          success++;
          await this.removeSyncOperation(operation.id);
        } else {
          failed++;
        }
      } catch (error) {
        console.error('❌ Sync operation failed:', operation, error);
        failed++;
      }
    }

    console.log(`✅ Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  // Get sync queue
  private async getSyncQueue(): Promise<SyncOperation[]> {
    if (!this.db) return [];
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject([]);
        };
      });
    } catch (error) {
      console.error('❌ Get sync queue error:', error);
      return [];
    }
  }

  // Execute sync operation
  private async executeSyncOperation(operation: SyncOperation): Promise<boolean> {
    try {
      const endpoint = this.getSyncEndpoint(operation.type, operation.operation);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: operation.operation,
          data: operation.data,
          timestamp: operation.timestamp
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Execute sync operation error:', error);
      return false;
    }
  }

  // Get sync endpoint for operation
  private getSyncEndpoint(type: string, operation: string): string {
    const endpoints = {
      'exam': '/api/sync/exams',
      'task': '/api/sync/tasks',
      'progress': '/api/sync/progress',
      'streak': '/api/sync/streaks'
    };
    
    return endpoints[type as keyof typeof endpoints] || '/api/sync/general';
  }

  // Remove sync operation
  private async removeSyncOperation(id: number): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.delete(id);
    } catch (error) {
      console.error('❌ Remove sync operation error:', error);
    }
  }

  // Clear all offline data
  async clearOfflineData(): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      const stores = ['exams', 'tasks', 'userProgress', 'streakData', 'settings', 'syncQueue'];
      
      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.clear();
      }
      
      console.log('🗑️ StudyQuest offline data cleared');
      return true;
    } catch (error) {
      console.error('❌ Clear offline data error:', error);
      return false;
    }
  }

  // Check if device is online and setup sync
  setupOnlineSync(): void {
    window.addEventListener('online', () => {
      console.log('🌐 StudyQuest: Device back online, starting sync...');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('📱 StudyQuest: Device offline, switching to offline mode');
    });

    // Periodic sync when online
    setInterval(() => {
      if (navigator.onLine) {
        this.syncOfflineData();
      }
    }, 5 * 60 * 1000); // Sync every 5 minutes when online
  }
}

// Sync operation interface
interface SyncOperation {
  id: number;
  type: 'exam' | 'task' | 'progress' | 'streak';
  operation: 'create' | 'update' | 'delete' | 'complete';
  data: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

// Export singleton instance
export const studyQuestOfflineManager = StudyQuestOfflineManager.getInstance();

// Utility functions for StudyQuest offline operations
export const StudyQuestOfflineUtils = {
  // Check if app is in offline mode
  isOffline: () => !navigator.onLine,
  
  // Save exam for offline use
  saveExam: (exam: ExamData) => studyQuestOfflineManager.saveExamOffline(exam),
  
  // Save task for offline use
  saveTask: (task: TaskData) => studyQuestOfflineManager.saveTaskOffline(task),
  
  // Update progress offline
  updateProgress: (progress: UserProgressData) => studyQuestOfflineManager.updateUserProgressOffline(progress),
  
  // Update streak offline
  updateStreak: (streak: StreakData) => studyQuestOfflineManager.updateStreakOffline(streak),
  
  // Get offline exams
  getOfflineExams: () => studyQuestOfflineManager.getOfflineData<ExamData[]>('exams'),
  
  // Get offline tasks
  getOfflineTasks: () => studyQuestOfflineManager.getOfflineData<TaskData[]>('tasks'),
  
  // Get offline user progress
  getOfflineProgress: () => studyQuestOfflineManager.getOfflineData<UserProgressData>('userProgress', 'current'),
  
  // Get offline streak data
  getOfflineStreak: () => studyQuestOfflineManager.getOfflineData<StreakData>('streakData', 'current'),
  
  // Initialize offline support
  initialize: () => studyQuestOfflineManager.initialize(),
  
  // Setup automatic sync
  setupSync: () => studyQuestOfflineManager.setupOnlineSync(),
  
  // Manual sync
  sync: () => studyQuestOfflineManager.syncOfflineData(),
  
  // Clear all data
  clearAll: () => studyQuestOfflineManager.clearOfflineData()
};

export type {
  StudyQuestOfflineData,
  ExamData,
  TaskData,
  UserProgressData,
  StreakData,
  SyncOperation
};