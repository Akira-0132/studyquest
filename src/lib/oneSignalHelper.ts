// OneSignal通知ヘルパー関数

/**
 * OneSignalで通知権限をリクエスト
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.OneSignal) {
    console.log('OneSignal not available');
    return false;
  }

  try {
    // OneSignalのスライドダウンプロンプトを表示
    await window.OneSignal.Slidedown.promptPush();
    
    // 権限状態を確認
    const permission = await window.OneSignal.Notifications.permission;
    return permission;
  } catch (error) {
    console.error('Failed to request OneSignal permission:', error);
    return false;
  }
}

/**
 * 通知設定を更新
 */
export async function updateOneSignalNotificationSettings(settings: {
  morning?: string;
  afternoon?: string;
  evening?: string;
  enabled?: boolean;
}) {
  if (typeof window === 'undefined' || !window.OneSignal) {
    console.log('OneSignal not available');
    return;
  }

  try {
    // ユーザータグを更新（サーバー側でセグメント化に使用）
    await window.OneSignal.User.addTags({
      notification_enabled: settings.enabled ? "true" : "false",
      morning_time: settings.morning || "07:00",
      afternoon_time: settings.afternoon || "16:00",
      evening_time: settings.evening || "20:00"
    });

    console.log('OneSignal tags updated:', settings);
  } catch (error) {
    console.error('Failed to update OneSignal settings:', error);
  }
}

/**
 * テスト通知を送信（ローカル）
 */
export async function sendOneSignalTestNotification(message?: string) {
  if (typeof window === 'undefined' || !window.OneSignal) {
    console.log('OneSignal not available');
    return false;
  }

  try {
    // ローカル通知を作成（これは即座に表示される）
    const notificationPermission = await window.OneSignal.Notifications.permission;
    
    if (!notificationPermission) {
      alert('通知権限がありません。設定から通知を有効にしてください。');
      return false;
    }

    // OneSignalの内部APIを使用してテスト通知を表示
    await window.OneSignal.sendSelfNotification(
      'StudyQuest テスト通知',
      message || '🎉 OneSignal通知が正常に動作しています！',
      'https://studyquest.vercel.app',
      '/icon-192x192.png',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    
    // フォールバック: 通常のWeb Notification APIを使用
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('StudyQuest テスト通知', {
        body: message || '🎉 通知が正常に動作しています！',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
      });
      return true;
    }
    
    return false;
  }
}

/**
 * 通知の有効/無効を切り替え
 */
export async function toggleOneSignalNotifications(enabled: boolean) {
  if (typeof window === 'undefined' || !window.OneSignal) {
    console.log('OneSignal not available');
    return false;
  }

  try {
    if (enabled) {
      // 通知を有効化
      await window.OneSignal.User.PushSubscription.optIn();
    } else {
      // 通知を無効化（購読解除）
      await window.OneSignal.User.PushSubscription.optOut();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to toggle notifications:', error);
    return false;
  }
}

/**
 * 現在の通知権限状態を取得
 */
export async function getOneSignalPermissionState(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.OneSignal) {
    return false;
  }

  try {
    const permission = await window.OneSignal.Notifications.permission;
    return permission;
  } catch (error) {
    console.error('Failed to get permission state:', error);
    return false;
  }
}

/**
 * OneSignalが初期化されているか確認
 */
export async function isOneSignalInitialized(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.OneSignal) {
    return false;
  }

  try {
    // OneSignalのプッシュ通知が有効か確認
    const isEnabled = await window.OneSignal.isPushNotificationsEnabled();
    return isEnabled;
  } catch (error) {
    console.error('Failed to check OneSignal initialization:', error);
    return false;
  }
}

/**
 * External IDを設定（ユーザー識別用）
 */
export async function setOneSignalExternalId(userId: string) {
  if (typeof window === 'undefined' || !window.OneSignal) {
    return;
  }

  try {
    await window.OneSignal.login(userId);
    console.log('OneSignal External ID set:', userId);
  } catch (error) {
    console.error('Failed to set External ID:', error);
  }
}