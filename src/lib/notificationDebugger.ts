// Comprehensive notification debugging system

export interface NotificationDebugResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
  timestamp: string;
}

export interface NotificationSystemHealth {
  overall: 'healthy' | 'issues' | 'broken';
  results: NotificationDebugResult[];
  summary: {
    total: number;
    success: number;
    warnings: number;
    errors: number;
  };
}

/**
 * 包括的な通知システム診断
 */
export async function diagnoseNotificationSystem(): Promise<NotificationSystemHealth> {
  const results: NotificationDebugResult[] = [];
  const timestamp = new Date().toISOString();
  
  // Step 1: Browser API Support Check
  results.push(await checkBrowserSupport());
  
  // Step 2: Service Worker Check
  results.push(await checkServiceWorker());
  
  // Step 3: Notification Permission Check
  results.push(await checkNotificationPermission());
  
  // Step 4: Push Subscription Check
  results.push(await checkPushSubscription());
  
  // Step 5: VAPID Configuration Check
  results.push(await checkVAPIDConfiguration());
  
  // Step 6: Server API Connectivity Check
  results.push(await checkServerAPIs());
  
  // Step 7: Notification Scheduler Check
  results.push(await checkNotificationScheduler());
  
  // Step 8: End-to-End Test
  results.push(await performEndToEndTest());
  
  // Calculate summary
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length
  };
  
  // Determine overall health
  let overall: 'healthy' | 'issues' | 'broken' = 'healthy';
  if (summary.errors > 0) {
    overall = 'broken';
  } else if (summary.warnings > 0) {
    overall = 'issues';
  }
  
  return {
    overall,
    results,
    summary
  };
}

async function checkBrowserSupport(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const support = {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      indexedDB: 'indexedDB' in window
    };
    
    const unsupported = Object.entries(support)
      .filter(([_, supported]) => !supported)
      .map(([api, _]) => api);
    
    if (unsupported.length === 0) {
      return {
        step: 'Browser API Support',
        status: 'success',
        message: 'All required APIs are supported',
        data: support,
        timestamp
      };
    } else {
      return {
        step: 'Browser API Support',
        status: 'error',
        message: `Unsupported APIs: ${unsupported.join(', ')}`,
        data: support,
        timestamp
      };
    }
  } catch (error) {
    return {
      step: 'Browser API Support',
      status: 'error',
      message: `Browser support check failed: ${error}`,
      timestamp
    };
  }
}

async function checkServiceWorker(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    if (!('serviceWorker' in navigator)) {
      return {
        step: 'Service Worker',
        status: 'error',
        message: 'Service Worker not supported',
        timestamp
      };
    }
    
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      return {
        step: 'Service Worker',
        status: 'error',
        message: 'Service Worker not registered',
        timestamp
      };
    }
    
    const info = {
      scope: registration.scope,
      active: !!registration.active,
      installing: !!registration.installing,
      waiting: !!registration.waiting,
      pushManager: !!registration.pushManager
    };
    
    if (!registration.active) {
      return {
        step: 'Service Worker',
        status: 'warning',
        message: 'Service Worker not active',
        data: info,
        timestamp
      };
    }
    
    return {
      step: 'Service Worker',
      status: 'success',
      message: 'Service Worker is active and ready',
      data: info,
      timestamp
    };
  } catch (error) {
    return {
      step: 'Service Worker',
      status: 'error',
      message: `Service Worker check failed: ${error}`,
      timestamp
    };
  }
}

async function checkNotificationPermission(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    if (!('Notification' in window)) {
      return {
        step: 'Notification Permission',
        status: 'error',
        message: 'Notification API not supported',
        timestamp
      };
    }
    
    const permission = Notification.permission;
    
    if (permission === 'granted') {
      return {
        step: 'Notification Permission',
        status: 'success',
        message: 'Notification permission granted',
        data: { permission },
        timestamp
      };
    } else if (permission === 'denied') {
      return {
        step: 'Notification Permission',
        status: 'error',
        message: 'Notification permission denied',
        data: { permission },
        timestamp
      };
    } else {
      return {
        step: 'Notification Permission',
        status: 'warning',
        message: 'Notification permission not yet requested',
        data: { permission },
        timestamp
      };
    }
  } catch (error) {
    return {
      step: 'Notification Permission',
      status: 'error',
      message: `Permission check failed: ${error}`,
      timestamp
    };
  }
}

async function checkPushSubscription(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration || !registration.pushManager) {
      return {
        step: 'Push Subscription',
        status: 'error',
        message: 'PushManager not available',
        timestamp
      };
    }
    
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return {
        step: 'Push Subscription',
        status: 'warning',
        message: 'No push subscription found',
        timestamp
      };
    }
    
    const subscriptionInfo = {
      endpoint: subscription.endpoint,
      hasKeys: {
        p256dh: !!subscription.getKey('p256dh'),
        auth: !!subscription.getKey('auth')
      }
    };
    
    return {
      step: 'Push Subscription',
      status: 'success',
      message: 'Push subscription active',
      data: subscriptionInfo,
      timestamp
    };
  } catch (error) {
    return {
      step: 'Push Subscription',
      status: 'error',
      message: `Push subscription check failed: ${error}`,
      timestamp
    };
  }
}

async function checkVAPIDConfiguration(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Check if VAPID public key is available
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BHvx5bXyuSIfYrkymeGlH6lR4SjsVJo7WZ1JsPzFAo3uNEXamy_qSBVEBPgIzeEgrscBoRSKZMo2GRTguiGeBP0';
    
    if (!vapidPublicKey) {
      return {
        step: 'VAPID Configuration',
        status: 'error',
        message: 'VAPID public key not configured',
        timestamp
      };
    }
    
    // Try to convert VAPID key to verify it's valid
    try {
      const padding = '='.repeat((4 - vapidPublicKey.length % 4) % 4);
      const base64 = (vapidPublicKey + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const rawData = window.atob(base64);
      
      if (rawData.length !== 65) {
        return {
          step: 'VAPID Configuration',
          status: 'error',
          message: `Invalid VAPID key length: expected 65, got ${rawData.length}`,
          data: { keyLength: rawData.length },
          timestamp
        };
      }
      
      return {
        step: 'VAPID Configuration',
        status: 'success',
        message: 'VAPID key is valid',
        data: { keyLength: rawData.length },
        timestamp
      };
    } catch (decodeError) {
      return {
        step: 'VAPID Configuration',
        status: 'error',
        message: `VAPID key decode failed: ${decodeError}`,
        timestamp
      };
    }
  } catch (error) {
    return {
      step: 'VAPID Configuration',
      status: 'error',
      message: `VAPID configuration check failed: ${error}`,
      timestamp
    };
  }
}

async function checkServerAPIs(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Test API endpoints
    const apiTests = [
      { endpoint: '/api/send-notification', method: 'GET' },
      { endpoint: '/api/schedule-notifications', method: 'GET' },
      { endpoint: '/api/send-scheduled-notifications', method: 'GET' }
    ];
    
    const results = [];
    
    for (const test of apiTests) {
      try {
        const response = await fetch(test.endpoint, { method: test.method });
        results.push({
          endpoint: test.endpoint,
          status: response.status,
          ok: response.ok
        });
      } catch (fetchError) {
        results.push({
          endpoint: test.endpoint,
          status: 'failed',
          error: String(fetchError)
        });
      }
    }
    
    const failedAPIs = results.filter(r => !r.ok && r.status !== 405); // 405 = Method Not Allowed (expected for some GET requests)
    
    if (failedAPIs.length === 0) {
      return {
        step: 'Server APIs',
        status: 'success',
        message: 'All API endpoints are accessible',
        data: results,
        timestamp
      };
    } else {
      return {
        step: 'Server APIs',
        status: 'warning',
        message: `${failedAPIs.length} API endpoints have issues`,
        data: results,
        timestamp
      };
    }
  } catch (error) {
    return {
      step: 'Server APIs',
      status: 'error',
      message: `Server API check failed: ${error}`,
      timestamp
    };
  }
}

async function checkNotificationScheduler(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Import scheduler functions
    const { getSchedulerStatus } = await import('./notificationScheduler');
    
    const status = getSchedulerStatus();
    
    if (status.running) {
      return {
        step: 'Notification Scheduler',
        status: 'success',
        message: 'Notification scheduler is running',
        data: status,
        timestamp
      };
    } else {
      return {
        step: 'Notification Scheduler',
        status: 'warning',
        message: 'Notification scheduler is not running',
        data: status,
        timestamp
      };
    }
  } catch (error) {
    return {
      step: 'Notification Scheduler',
      status: 'error',
      message: `Scheduler check failed: ${error}`,
      timestamp
    };
  }
}

async function performEndToEndTest(): Promise<NotificationDebugResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Get subscription
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration');
    }
    
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription');
    }
    
    // Convert subscription safely
    let subscriptionData;
    try {
      subscriptionData = subscription.toJSON();
    } catch (jsonError) {
      // Fallback for iOS Safari PWA bug
      subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') 
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
            : '',
          auth: subscription.getKey('auth') 
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            : ''
        }
      };
    }
    
    // Try to send a test notification via server
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        title: '🧪 End-to-End Test',
        body: 'Notification system working correctly!'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        step: 'End-to-End Test',
        status: 'success',
        message: 'Test notification sent successfully',
        data: result,
        timestamp
      };
    } else {
      const errorText = await response.text();
      return {
        step: 'End-to-End Test',
        status: 'error',
        message: `Test notification failed: ${errorText}`,
        timestamp
      };
    }
  } catch (error) {
    return {
      step: 'End-to-End Test',
      status: 'error',
      message: `End-to-end test failed: ${error}`,
      timestamp
    };
  }
}

/**
 * 通知システムの修復提案を生成
 */
export function generateRepairSuggestions(health: NotificationSystemHealth): string[] {
  const suggestions: string[] = [];
  
  for (const result of health.results) {
    if (result.status === 'error' || result.status === 'warning') {
      switch (result.step) {
        case 'Browser API Support':
          suggestions.push('ブラウザを最新版にアップデートしてください');
          suggestions.push('HTTPS環境で実行してください');
          break;
        case 'Service Worker':
          suggestions.push('ページを再読み込みしてService Workerを再登録してください');
          suggestions.push('ブラウザの開発者ツールでService Workerの状態を確認してください');
          break;
        case 'Notification Permission':
          suggestions.push('ブラウザの設定で通知を許可してください');
          suggestions.push('「通知を有効にする」ボタンを押して権限を要求してください');
          break;
        case 'Push Subscription':
          suggestions.push('「バックグラウンド通知を有効にする」ボタンを押してください');
          suggestions.push('iOS Safariの場合、PWAをホーム画面に追加してください');
          break;
        case 'VAPID Configuration':
          suggestions.push('環境変数でVAPIDキーが正しく設定されているか確認してください');
          break;
        case 'Server APIs':
          suggestions.push('サーバーが正常に動作しているか確認してください');
          suggestions.push('ネットワーク接続を確認してください');
          break;
        case 'Notification Scheduler':
          suggestions.push('通知を有効にするとスケジューラーが自動的に開始されます');
          break;
        case 'End-to-End Test':
          suggestions.push('上記の問題を修正してから再度テストしてください');
          break;
      }
    }
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}