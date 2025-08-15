// OneSignal通知ヘルパー関数（最新API対応）

/**
 * OneSignalが初期化されているか確認
 */
async function waitForOneSignal(timeout = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (window.OneSignal) {
      try {
        const initialized = await window.OneSignal.isPushNotificationsSupported();
        if (initialized) {
          return true;
        }
      } catch (e) {
        // まだ初期化されていない
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}

/**
 * OneSignalで通知権限をリクエスト
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  console.log('requestOneSignalPermission called');
  
  // OneSignalの初期化を待つ
  const isReady = await waitForOneSignal();
  
  if (!isReady) {
    console.log('OneSignal not ready, using native permission request');
    // フォールバック: 通常のWeb Notification APIを使用
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  try {
    // 現在の権限状態を確認
    const currentPermission = await window.OneSignal.getNotificationPermission();
    console.log('Current permission:', currentPermission);
    
    if (currentPermission === 'granted') {
      // すでに許可されている場合は購読を有効化
      await window.OneSignal.setSubscription(true);
      return true;
    }
    
    // プロンプトを表示
    console.log('Showing permission prompt...');
    const permission = await window.OneSignal.showNativePrompt();
    console.log('Permission result:', permission);
    
    if (permission) {
      // 購読を有効化
      await window.OneSignal.setSubscription(true);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('OneSignal permission error:', error);
    
    // エラーの詳細を確認
    if (error && typeof error === 'object' && 'reason' in error) {
      console.error('Error reason:', (error as any).reason);
    }
    
    // フォールバック
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
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
  const isReady = await waitForOneSignal();
  
  if (!isReady) {
    console.log('OneSignal not ready for settings update');
    return;
  }

  try {
    // タグを設定
    await window.OneSignal.sendTags({
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
 * テスト通知を送信
 */
export async function sendOneSignalTestNotification(message?: string) {
  console.log('sendOneSignalTestNotification called');
  
  const isReady = await waitForOneSignal();
  
  if (!isReady) {
    console.log('OneSignal not ready, using native notification');
    // フォールバック
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

  try {
    // 権限確認
    const permission = await window.OneSignal.getNotificationPermission();
    
    if (permission !== 'granted') {
      alert('通知権限がありません。設定から通知を有効にしてください。');
      return false;
    }

    // OneSignal APIを使用してローカル通知を作成
    // 注: これは即座に表示される通知です
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('StudyQuest テスト通知', {
        body: message || '🎉 OneSignal通知が正常に動作しています！',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
}

/**
 * 通知の有効/無効を切り替え
 */
export async function toggleOneSignalNotifications(enabled: boolean) {
  const isReady = await waitForOneSignal();
  
  if (!isReady) {
    console.log('OneSignal not ready for toggle');
    return false;
  }

  try {
    await window.OneSignal.setSubscription(enabled);
    console.log('Subscription set to:', enabled);
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
  const isReady = await waitForOneSignal(1000); // 短いタイムアウト
  
  if (!isReady) {
    // フォールバック
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  try {
    const permission = await window.OneSignal.getNotificationPermission();
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    return permission === 'granted' && isSubscribed;
  } catch (error) {
    console.error('Failed to get permission state:', error);
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }
}

/**
 * OneSignalが初期化されているか確認
 */
export async function isOneSignalInitialized(): Promise<boolean> {
  return await waitForOneSignal(1000);
}

/**
 * External IDを設定（ユーザー識別用）
 */
export async function setOneSignalExternalId(userId: string) {
  const isReady = await waitForOneSignal();
  
  if (!isReady) {
    console.log('OneSignal not ready for external ID');
    return;
  }

  try {
    await window.OneSignal.setExternalUserId(userId);
    console.log('OneSignal External ID set:', userId);
  } catch (error) {
    console.error('Failed to set External ID:', error);
  }
}