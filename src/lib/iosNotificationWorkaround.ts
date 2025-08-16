// iOS Safari PWA通知システムのバグ回避・フォールバック機能

import { isiOSSafariPWA, isPWAInstalled, isiOSNotificationSupported } from './nativePushManager';

/**
 * iOS特有のバグ監視・回避システム
 */
export class IOSNotificationWorkaround {
  private retryCount = 0;
  private maxRetries = 3;
  private fallbackEnabled = false;
  private debugLog: string[] = [];

  /**
   * iOS通知システムの健全性チェック
   */
  async checkSystemHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 基本環境チェック
      if (!isiOSSafariPWA()) {
        return { healthy: true, issues: [], recommendations: [] };
      }

      this.addDebugLog('🔍 Starting iOS system health check...');

      // PWA状態確認
      if (!isPWAInstalled()) {
        issues.push('PWA not installed to home screen');
        recommendations.push('Install app to home screen: Safari → Share → Add to Home Screen');
      }

      // Service Worker状態確認
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            issues.push('Service Worker not registered');
            recommendations.push('Reload the app to register Service Worker');
          } else if (!registration.active) {
            issues.push('Service Worker not active');
            recommendations.push('Close and reopen the app');
          }

          // PushManagerの可用性チェック（iOS固有のバグ）
          if (registration && !registration.pushManager) {
            issues.push('PushManager unavailable (iOS Safari bug)');
            recommendations.push('Close Safari completely and reopen the PWA');
          } else if (registration && registration.pushManager) {
            // プッシュ購読の健全性チェック
            try {
              const subscription = await registration.pushManager.getSubscription();
              if (subscription) {
                // 購読の有効性をテスト
                const subscriptionTest = await this.testSubscriptionHealth(subscription);
                if (!subscriptionTest.valid) {
                  issues.push(`Push subscription invalid: ${subscriptionTest.reason}`);
                  recommendations.push('Re-enable notifications to create new subscription');
                }
                
                // Silent push カウンターチェック
                const silentPushCount = parseInt(localStorage.getItem('ios_silent_push_count') || '0');
                if (silentPushCount >= 2) {
                  issues.push(`High silent push count: ${silentPushCount}/3 (risk of termination)`);
                  recommendations.push('Send test notification to reset silent push counter');
                }
              } else {
                issues.push('No active push subscription found');
                recommendations.push('Enable notifications to create subscription');
              }
            } catch (subscriptionError) {
              issues.push(`Push subscription check failed: ${(subscriptionError as Error).message}`);
              recommendations.push('Re-enable notifications');
            }
          }
        } catch (error) {
          issues.push(`Service Worker error: ${(error as Error).message}`);
          recommendations.push('Restart Safari/PWA');
        }
      }

      // IndexedDBアクセステスト（iOS 18.1.1+バグ対策）
      try {
        if (typeof indexedDB !== 'undefined') {
          const testDB = indexedDB.open('health-check', 1);
          await new Promise((resolve, reject) => {
            testDB.onsuccess = () => {
              testDB.result.close();
              resolve(void 0);
            };
            testDB.onerror = () => reject(testDB.error);
            setTimeout(() => reject(new Error('IndexedDB timeout')), 5000);
          });
        } else {
          issues.push('IndexedDB unavailable in this context');
          recommendations.push('This is a known iOS 18.1.1+ bug in push notification context');
        }
      } catch (error) {
        issues.push(`IndexedDB access failed: ${(error as Error).message}`);
        recommendations.push('Restart the app if notifications fail');
      }

      const healthy = issues.length === 0;
      this.addDebugLog(`🏥 Health check complete: ${healthy ? 'HEALTHY' : 'ISSUES FOUND'}`);

      return { healthy, issues, recommendations };
    } catch (error) {
      this.addDebugLog(`❌ Health check failed: ${error}`);
      return {
        healthy: false,
        issues: [`Health check failed: ${(error as Error).message}`],
        recommendations: ['Restart the app']
      };
    }
  }

  /**
   * プッシュ購読の健全性テスト
   */
  private async testSubscriptionHealth(subscription: PushSubscription): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    try {
      this.addDebugLog('🔍 Testing push subscription health...');
      
      // 基本的なプロパティチェック
      if (!subscription.endpoint) {
        return { valid: false, reason: 'Missing endpoint' };
      }
      
      // キーの存在確認
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        return { valid: false, reason: 'Missing encryption keys' };
      }
      
      // iOS Safari PWA: toJSON()バグチェック
      try {
        const jsonTest = subscription.toJSON();
        if (!jsonTest.endpoint || !jsonTest.keys) {
          return { valid: false, reason: 'toJSON() returns incomplete data' };
        }
      } catch (jsonError) {
        this.addDebugLog('⚠️ subscription.toJSON() bug detected (iOS Safari PWA known issue)');
        // これは既知のバグなので、他の手段でテスト継続
      }
      
      // サーバー側での購読テスト（軽量なping）
      try {
        const response = await fetch('/api/subscription-health-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint.substring(0, 100) // 最初の100文字のみでテスト
          })
        });
        
        if (!response.ok) {
          return { valid: false, reason: `Server health check failed: ${response.status}` };
        }
        
        const result = await response.json();
        if (!result.valid) {
          return { valid: false, reason: result.reason || 'Server validation failed' };
        }
      } catch (serverError) {
        this.addDebugLog(`⚠️ Server health check failed: ${serverError}`);
        // サーバーエラーは購読自体の問題ではないのでcontinue
      }
      
      this.addDebugLog('✅ Push subscription appears healthy');
      return { valid: true };
      
    } catch (error) {
      this.addDebugLog(`❌ Subscription health test failed: ${error}`);
      return { valid: false, reason: (error as Error).message };
    }
  }

  /**
   * iOS通知送信のリトライ機能
   */
  async sendNotificationWithRetry(
    title: string,
    body: string,
    options: NotificationOptions = {}
  ): Promise<boolean> {
    this.addDebugLog(`🔄 Attempting notification: ${title}`);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.addDebugLog(`📋 Attempt ${attempt}/${this.maxRetries}`);

        // 標準通知送信
        const success = await this.sendNotificationDirect(title, body, options);
        if (success) {
          this.addDebugLog(`✅ Notification sent successfully on attempt ${attempt}`);
          this.retryCount = 0;
          return true;
        }
      } catch (error) {
        this.addDebugLog(`❌ Attempt ${attempt} failed: ${error}`);
        
        // iOS特有のエラー分析
        if ((error as Error).name === 'InvalidStateError') {
          this.addDebugLog('🔧 InvalidStateError detected, applying iOS workaround...');
          await this.applyIOSWorkaround();
        }
        
        // 最後の試行でない場合は待機
        if (attempt < this.maxRetries) {
          const delay = 1000 * attempt; // 指数バックオフ
          this.addDebugLog(`⏱️ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.addDebugLog('❌ All retry attempts failed, enabling fallback...');
    this.fallbackEnabled = true;
    return await this.sendFallbackNotification(title, body, options);
  }

  /**
   * 直接通知送信
   */
  private async sendNotificationDirect(
    title: string,
    body: string,
    options: NotificationOptions
  ): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('Service Worker not available');
      }

      await registration.showNotification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        requireInteraction: true, // iOS向け
        ...options
      });

      return true;
    } catch (error) {
      this.addDebugLog(`❌ Direct notification failed: ${error}`);
      throw error;
    }
  }

  /**
   * iOS固有の問題回避処理
   */
  private async applyIOSWorkaround(): Promise<void> {
    this.addDebugLog('🔧 Applying iOS-specific workarounds...');

    try {
      // Service Workerの再アクティベーション
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        this.addDebugLog('🔄 Activating waiting Service Worker...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // PushManagerの再初期化試行
      if (registration && !registration.pushManager) {
        this.addDebugLog('🔧 PushManager unavailable, requesting app restart...');
        throw new Error('PushManager bug detected - app restart required');
      }

    } catch (error) {
      this.addDebugLog(`⚠️ iOS workaround failed: ${error}`);
      throw error;
    }
  }

  /**
   * フォールバック通知（Notification API直接使用）
   */
  private async sendFallbackNotification(
    title: string,
    body: string,
    options: NotificationOptions
  ): Promise<boolean> {
    this.addDebugLog('🆘 Using fallback notification method...');

    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          ...options
        });

        // 自動閉じる
        setTimeout(() => {
          notification.close();
        }, 5000);

        this.addDebugLog('✅ Fallback notification sent');
        return true;
      } else {
        throw new Error('Fallback notification not available');
      }
    } catch (error) {
      this.addDebugLog(`❌ Fallback notification failed: ${error}`);
      return false;
    }
  }

  /**
   * LocalStorageベースの代替スケジューラー（iOS IndexedDBバグ対策）
   */
  async scheduleNotificationsFallback(settings: {
    morning: string;
    afternoon: string;
    evening: string;
  }): Promise<void> {
    this.addDebugLog('📅 Setting up fallback notification scheduler...');

    try {
      // LocalStorageに設定を保存
      const fallbackSchedule = {
        enabled: true,
        settings,
        lastCheck: Date.now(),
        nextChecks: this.calculateNextNotificationTimes(settings)
      };

      localStorage.setItem('ios_notification_fallback', JSON.stringify(fallbackSchedule));

      // 定期チェック開始
      this.startFallbackScheduler();

      this.addDebugLog('✅ Fallback scheduler configured');
    } catch (error) {
      this.addDebugLog(`❌ Fallback scheduler setup failed: ${error}`);
      throw error;
    }
  }

  /**
   * 次回通知時刻の計算
   */
  private calculateNextNotificationTimes(settings: {
    morning: string;
    afternoon: string;
    evening: string;
  }): number[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const times: number[] = [];

    // 今日の通知時刻をチェック（時刻文字列のみを処理）
    const timeKeys = ['morning', 'afternoon', 'evening'] as const;
    for (const period of timeKeys) {
      const timeStr = settings[period];
      if (typeof timeStr === 'string' && timeStr.includes(':')) {
        try {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const notificationTime = new Date(today.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
          
          if (notificationTime > now) {
            times.push(notificationTime.getTime());
          } else {
            // 今日の時刻が過ぎていれば明日の時刻を追加
            const tomorrowTime = new Date(tomorrow.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
            times.push(tomorrowTime.getTime());
          }
        } catch (error) {
          this.addDebugLog(`⚠️ Invalid time format for ${period}: ${timeStr}`);
        }
      }
    }

    return times.sort();
  }

  /**
   * フォールバックスケジューラー開始
   */
  private startFallbackScheduler(): void {
    // 1分ごとにチェック
    setInterval(() => {
      this.checkFallbackNotifications();
    }, 60 * 1000);
  }

  /**
   * フォールバック通知チェック
   */
  private async checkFallbackNotifications(): Promise<void> {
    try {
      const scheduleData = localStorage.getItem('ios_notification_fallback');
      if (!scheduleData) return;

      const schedule = JSON.parse(scheduleData);
      if (!schedule.enabled) return;

      const now = Date.now();
      const { nextChecks, settings } = schedule;

      for (const checkTime of nextChecks) {
        if (Math.abs(now - checkTime) < 60 * 1000) { // 1分以内
          const hour = new Date(checkTime).getHours();
          let message = '';

          if (hour < 12) {
            message = 'おはよう！今日も頑張ろう！🌅';
          } else if (hour < 18) {
            message = '学校お疲れさま！勉強始めよう📚';
          } else {
            message = 'ラストスパート！もう少し！💪';
          }

          await this.sendNotificationWithRetry('StudyQuest - リマインダー', message);

          // 次回の通知時刻を更新
          const updatedSchedule = {
            ...schedule,
            nextChecks: this.calculateNextNotificationTimes(settings),
            lastCheck: now
          };
          localStorage.setItem('ios_notification_fallback', JSON.stringify(updatedSchedule));
          break;
        }
      }
    } catch (error) {
      this.addDebugLog(`❌ Fallback notification check failed: ${error}`);
    }
  }

  /**
   * デバッグログ追加
   */
  private addDebugLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    this.debugLog.push(logEntry);
    console.log(logEntry);

    // 最新50件のみ保持
    if (this.debugLog.length > 50) {
      this.debugLog = this.debugLog.slice(-50);
    }
  }

  /**
   * デバッグログ取得
   */
  getDebugLog(): string[] {
    return [...this.debugLog];
  }

  /**
   * システム状態リセット
   */
  reset(): void {
    this.retryCount = 0;
    this.fallbackEnabled = false;
    this.debugLog = [];
    localStorage.removeItem('ios_notification_fallback');
  }
}

// シングルトンインスタンス
export const iosNotificationWorkaround = new IOSNotificationWorkaround();