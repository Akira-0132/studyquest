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
  console.log('🔔 OneSignal通知権限をリクエスト中...');
  
  // OneSignalの初期化を待つ
  const isReady = await waitForOneSignal();
  
  if (!isReady) {
    console.log('❌ OneSignal not ready, using native permission request');
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
    console.log('📋 Current OneSignal permission:', currentPermission);
    
    // 現在の購読状態も確認
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    console.log('📋 Current subscription state:', isSubscribed);
    
    if (currentPermission === 'granted') {
      if (!isSubscribed) {
        // 権限はあるが購読されていない場合
        console.log('✅ Permission granted, enabling subscription...');
        await window.OneSignal.setSubscription(true);
      }
      return true;
    }
    
    // 権限がない場合は新しいAPIを使用してプロンプトを表示
    console.log('📝 Requesting notification permission...');
    
    // 最新のAPIを使用
    const permissionResult = await window.OneSignal.requestPermission();
    console.log('📊 Permission request result:', permissionResult);
    
    if (permissionResult) {
      // 購読も有効化
      await window.OneSignal.setSubscription(true);
      console.log('✅ OneSignal subscription enabled');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ OneSignal permission error:', error);
    
    // エラーの詳細を確認
    if (error && typeof error === 'object' && 'reason' in error) {
      console.error('Error reason:', (error as any).reason);
    }
    
    // フォールバック: ネイティブAPIを試す
    console.log('🔄 Trying native Notification API as fallback...');
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      if (granted) {
        try {
          // ネイティブ権限が取得できた場合、OneSignalの購読も有効化を試す
          await window.OneSignal.setSubscription(true);
        } catch (e) {
          console.log('Failed to enable OneSignal subscription, but native permission granted');
        }
      }
      
      return granted;
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
  const isReady = await waitForOneSignal(2000); // タイムアウトを延長
  
  if (!isReady) {
    console.log('⏰ OneSignal not ready, using native permission check');
    // フォールバック
    if ('Notification' in window) {
      const nativePermission = Notification.permission === 'granted';
      console.log('📋 Native permission state:', nativePermission);
      return nativePermission;
    }
    return false;
  }

  try {
    const permission = await window.OneSignal.getNotificationPermission();
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    const result = permission === 'granted' && isSubscribed;
    
    console.log('📊 OneSignal permission details:', {
      permission,
      isSubscribed,
      finalResult: result
    });
    
    return result;
  } catch (error) {
    console.error('❌ Failed to get OneSignal permission state:', error);
    if ('Notification' in window) {
      const nativePermission = Notification.permission === 'granted';
      console.log('🔄 Fallback to native permission:', nativePermission);
      return nativePermission;
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