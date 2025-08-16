// Client-side notification scheduler for triggering server-side scheduled notifications

let schedulerInterval: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;

/**
 * バックグラウンド通知スケジューラーを開始
 * クライアントサイドで定期的にサーバーの scheduled notifications をチェック
 */
export function startNotificationScheduler(): void {
  if (isSchedulerRunning) {
    console.log('📅 Notification scheduler is already running');
    return;
  }
  
  console.log('🚀 Starting notification scheduler...');
  isSchedulerRunning = true;
  
  // 1分ごとにサーバーの scheduled notifications をチェック
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndTriggerScheduledNotifications();
    } catch (error) {
      console.error('❌ Scheduler check error:', error);
    }
  }, 60000); // 60秒 = 1分
  
  // 即座に一回実行
  setTimeout(() => {
    checkAndTriggerScheduledNotifications().catch(error => {
      console.error('❌ Initial scheduler check error:', error);
    });
  }, 2000); // 2秒後に実行
  
  console.log('✅ Notification scheduler started (checks every minute)');
}

/**
 * バックグラウンド通知スケジューラーを停止
 */
export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  isSchedulerRunning = false;
  console.log('🛑 Notification scheduler stopped');
}

/**
 * スケジューラーの状態を取得
 */
export function getSchedulerStatus(): { running: boolean; interval: number } {
  return {
    running: isSchedulerRunning,
    interval: 60000 // 1分間隔
  };
}

/**
 * サーバーサイドのスケジュール済み通知をチェックして送信
 */
async function checkAndTriggerScheduledNotifications(): Promise<void> {
  try {
    console.log('⏰ Checking scheduled notifications...');
    
    const response = await fetch('/api/send-scheduled-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Scheduled notifications check failed:', errorText);
      return;
    }
    
    const result = await response.json();
    
    if (result.summary.sent > 0) {
      console.log(`📬 ${result.summary.sent} scheduled notifications sent`);
      console.log('📋 Notification details:', result.results.filter((r: any) => r.status === 'sent'));
    }
    
    if (result.summary.failed > 0) {
      console.warn(`⚠️ ${result.summary.failed} scheduled notifications failed`);
      console.warn('📋 Failed notifications:', result.results.filter((r: any) => r.status === 'failed'));
    }
    
    // デバッグログ（通知が送信された場合のみ詳細ログ出力）
    if (result.summary.sent > 0 || result.summary.failed > 0) {
      console.log('📊 Scheduler check summary:', {
        currentTime: result.currentTime,
        sent: result.summary.sent,
        failed: result.summary.failed,
        totalChecked: result.summary.totalChecked
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to check scheduled notifications:', error);
  }
}

/**
 * 手動でスケジュール済み通知チェックを実行（デバッグ用）
 */
export async function manualSchedulerCheck(): Promise<{ sent: number; failed: number }> {
  console.log('🔧 Manual scheduler check triggered...');
  
  try {
    await checkAndTriggerScheduledNotifications();
    
    // 結果を取得
    const statusResponse = await fetch('/api/send-scheduled-notifications', {
      method: 'GET'
    });
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      return {
        sent: 0, // 実際の送信数は POST レスポンスから取得する必要がある
        failed: 0
      };
    }
    
    return { sent: 0, failed: 0 };
  } catch (error) {
    console.error('❌ Manual scheduler check failed:', error);
    return { sent: 0, failed: 1 };
  }
}

/**
 * 次回の通知予定時刻を計算
 */
export function getNextScheduledTime(schedule: { morning: string; afternoon: string; evening: string }): { nextTime: string; timeType: string } | null {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  const times = [
    { type: 'morning', time: schedule.morning },
    { type: 'afternoon', time: schedule.afternoon },
    { type: 'evening', time: schedule.evening }
  ];
  
  // 今日の残り時間をチェック
  for (const timeSlot of times) {
    const [hour, minute] = timeSlot.time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;
    
    if (timeMinutes > currentTimeMinutes) {
      return {
        nextTime: timeSlot.time,
        timeType: timeSlot.type
      };
    }
  }
  
  // 今日の予定がすべて終了している場合は明日の朝
  return {
    nextTime: schedule.morning,
    timeType: 'morning'
  };
}

/**
 * 指定時刻まであと何分かを計算
 */
export function getMinutesUntilNext(targetTime: string): number {
  const now = new Date();
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);
  
  let target = new Date();
  target.setHours(targetHour, targetMinute, 0, 0);
  
  // もし指定時刻が過去の場合は明日に設定
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60)); // 分に変換
}