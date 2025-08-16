// 共有サーバーサイドストレージ（本格実装はデータベース使用）

// プッシュ購読情報ストレージ
export const subscriptions = new Map();

// 通知スケジュール情報ストレージ
export const notificationSchedules = new Map();

// ストレージ統計情報
export function getStorageStats() {
  return {
    subscriptions: subscriptions.size,
    schedules: notificationSchedules.size,
    timestamp: new Date().toISOString()
  };
}

// サブスクリプションキー生成
export function generateSubscriptionKey(endpoint: string): string {
  try {
    return btoa(endpoint).substring(0, 20);
  } catch (error) {
    // fallback for edge cases
    return endpoint.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  }
}