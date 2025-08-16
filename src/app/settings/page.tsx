'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import { ClientOnly } from '@/components/ClientOnly';
import { getUserData, updateUserData } from '@/lib/streakManager';
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  getPushPermissionState,
  getActiveSubscription,
  isiOSSafariPWA,
  isPWAInstalled,
  isiOSNotificationSupported
} from '@/lib/nativePushManager';
import { scheduleNotifications as scheduleNotificationsPush } from '@/lib/pushNotificationManager';
import { iosNotificationWorkaround } from '@/lib/iosNotificationWorkaround';
import { IOSPWAGuide } from '@/components/IOSPWAGuide';
import { startNotificationScheduler, stopNotificationScheduler, getSchedulerStatus, manualSchedulerCheck, getNextScheduledTime, getMinutesUntilNext } from '@/lib/notificationScheduler';
import { diagnoseNotificationSystem, generateRepairSuggestions, type NotificationSystemHealth } from '@/lib/notificationDebugger';

export default function SettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    morning: '07:00',
    afternoon: '16:00',
    evening: '20:00',
    schedule: {
      morning: '07:00',
      afternoon: '16:00',
      evening: '20:00'
    }
  });

  const [userData, setUserData] = useState({
    level: 1,
    exp: 0,
    currentStreak: 0,
    maxStreak: 0,
    streakProtection: 0,
    totalTasksCompleted: 0,
    badges: [] as string[],
  });

  // デバッグログを画面に表示するためのstate
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // iOS PWA通知追跡
  const [notificationDisplayHistory, setNotificationDisplayHistory] = useState<{
    timestamp: string;
    title: string;
    body: string;
    tag: string;
    source: string;
  }[]>([]);
  const [silentPushCount, setSilentPushCount] = useState(0);
  
  // 通知スケジューラーの状態
  const [schedulerStatus, setSchedulerStatus] = useState({ running: false, interval: 60000 });
  const [nextNotification, setNextNotification] = useState<{ nextTime: string; timeType: string; minutesUntil: number } | null>(null);
  
  // 通知システム診断結果
  const [systemHealth, setSystemHealth] = useState<NotificationSystemHealth | null>(null);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  
  // iOS PWA関連state
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  const [iosSystemHealth, setIOSSystemHealth] = useState<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    isIOS: boolean;
    isPWA: boolean;
    notificationSupported: {
      supported: boolean;
      reason?: string;
      recommendations?: string[];
    };
  }>({
    isIOS: false,
    isPWA: false,
    notificationSupported: { supported: false, reason: '', recommendations: [] as string[] }
  });

  // コンソールログをキャプチャして画面に表示
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  // 🚀 バックグラウンド通知システム（iOS対応強化版）
  const setupBackgroundNotifications = async () => {
    addDebugLog('🚀 バックグラウンド通知セットアップ開始（iOS対応版）...');
    
    try {
      // iOS事前診断
      const health = await performIOSSystemDiagnosis();
      if (health && !health.healthy) {
        addDebugLog('⚠️ iOS system issues detected, but proceeding...');
        
        // PWAインストールが必要な場合はガイドを表示
        if (deviceInfo.isIOS && !deviceInfo.isPWA) {
          addDebugLog('📱 iOS device without PWA installation detected');
          alert('📱 iOSでバックグラウンド通知を利用するには、アプリをホーム画面に追加する必要があります。\n\nガイドを表示しますか？');
          setShowPWAGuide(true);
          return false;
        }
      }
      
      // ブラウザ環境確認
      addDebugLog(`🔍 環境確認:`);
      addDebugLog(`- User Agent: ${navigator.userAgent.substring(0, 50)}...`);
      addDebugLog(`- PWA Mode: ${window.matchMedia('(display-mode: standalone)').matches}`);
      addDebugLog(`- HTTPS: ${location.protocol === 'https:'}`);
      addDebugLog(`- iOS Device: ${deviceInfo.isIOS}`);
      addDebugLog(`- PWA Installed: ${deviceInfo.isPWA}`);
      
      // iOS特有の事前チェック
      if (deviceInfo.isIOS && !deviceInfo.notificationSupported.supported) {
        addDebugLog(`❌ iOS notification requirements not met: ${deviceInfo.notificationSupported.reason}`);
        alert(`❌ iOS通知要件が満たされていません。\n\n原因: ${deviceInfo.notificationSupported.reason}\n\n推奨解決策:\n${deviceInfo.notificationSupported.recommendations?.join('\n')}`);
        return false;
      }
      
      // 権限リクエスト
      addDebugLog('📋 Step 1: 通知権限リクエスト');
      const permission = await Notification.requestPermission();
      addDebugLog(`📋 通知権限結果: ${permission}`);
      
      if (permission !== 'granted') {
        addDebugLog('❌ 通知権限が拒否されました');
        const errorMessage = deviceInfo.isIOS 
          ? '❌ 通知権限が必要です。\n\n【iOS解決方法】\n1. 設定 → Safari → Webサイト → 通知\n2. このサイトを「許可」に設定\n3. アプリを再起動'
          : '❌ 通知権限が必要です。\n\n【解決方法】\n1. ブラウザの設定を開く\n2. このサイトの通知を「許可」に設定\n3. ページを再読み込み';
        alert(errorMessage);
        return false;
      }
      
      addDebugLog('✅ 通知権限が許可されました');
      
      // プッシュ購読（iOS対応強化版）
      addDebugLog('📋 Step 2: プッシュ購読作成');
      let subscription;
      
      try {
        subscription = await subscribeToPush();
      } catch (error) {
        addDebugLog(`❌ 標準購読失敗、iOS回避策を適用: ${error}`);
        
        // iOS特有のエラーの場合、回避策を適用
        if (deviceInfo.isIOS && (error as Error).message.includes('iOS')) {
          addDebugLog('🔧 Applying iOS-specific workarounds...');
          alert('iOS Safari固有の問題が発生しました。\n\n回避策:\n1. アプリを完全に閉じる\n2. Safariを再起動\n3. ホーム画面からアプリを開き直す\n4. 再度通知設定を試す');
          return false;
        }
        
        throw error;
      }
      
      if (!subscription) {
        addDebugLog('❌ プッシュ購読作成に失敗');
        const errorMessage = deviceInfo.isIOS
          ? '❌ iOS プッシュ通知の購読に失敗しました。\n\n【iOS対策】\n- Safari/PWAを完全に再起動\n- ホーム画面からアプリを開く\n- iOS 16.4以降であることを確認\n\nデバッグログで詳細を確認してください。'
          : '❌ プッシュ通知の購読に失敗しました。\n\n【考えられる原因】\n- Service Workerの問題\n- VAPIDキーの問題\n\nデバッグログを確認してください。';
        alert(errorMessage);
        return false;
      }
      
      addDebugLog('✅ プッシュ購読作成完了');
      addDebugLog(`📝 Subscription endpoint: ${subscription.endpoint.substring(0, 30)}...`);
      
      // スケジュール設定
      addDebugLog('📋 Step 3: スケジュール通知設定');
      try {
        await scheduleNotificationsPush();
        const success = true;
        if (success) {
          addDebugLog('✅ スケジュール通知設定完了');
          
          // 状態更新
          const newSettings = { ...notificationSettings, enabled: true };
          setNotificationSettings(newSettings);
          localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
          
          // クライアントサイド通知スケジューラーを開始
          addDebugLog('🚀 Starting client-side notification scheduler...');
          startNotificationScheduler();
          setSchedulerStatus(getSchedulerStatus());
          updateNextNotificationInfo(newSettings);
          
          addDebugLog('🎉 バックグラウンド通知システム有効化完了');
          alert('🎉 バックグラウンド通知が設定されました！\n\n✅ アプリが閉じていても指定時刻に通知が届きます\n✅ テスト通知ボタンで動作確認できます\n✅ 自動スケジューラーが開始されました');
          return true;
        } else {
          addDebugLog('❌ スケジュール設定に失敗');
          alert('⚠️ スケジュール設定に失敗しましたが、\nプッシュ購読は成功しました。\nテスト通知は利用できます。');
          return false;
        }
      } catch (scheduleError) {
        addDebugLog(`❌ スケジュール設定エラー: ${scheduleError}`);
        alert('⚠️ スケジュール設定でエラーが発生しましたが、\nプッシュ購読は成功しました。\nテスト通知は利用できます。');
        return false;
      }
      
    } catch (error) {
      addDebugLog(`❌ セットアップ全般エラー: ${error}`);
      addDebugLog(`❌ エラー詳細: ${JSON.stringify({
        name: (error as Error).name,
        message: (error as Error).message
      })}`);
      
      alert('❌ バックグラウンド通知のセットアップに失敗しました。\n\nデバッグログで詳細を確認してください。');
      return false;
    }
  };

  // iOS システム診断
  const performIOSSystemDiagnosis = async () => {
    addDebugLog('🔍 Starting iOS system diagnosis...');
    
    try {
      // デバイス情報更新
      const isIOS = isiOSSafariPWA();
      const isPWA = isPWAInstalled();
      const notificationSupported = isiOSNotificationSupported();
      
      setDeviceInfo({ isIOS, isPWA, notificationSupported });
      addDebugLog(`📱 Device Info: iOS=${isIOS}, PWA=${isPWA}, Notifications=${notificationSupported.supported}`);
      
      // システムヘルスチェック  
      let health;
      try {
        health = await iosNotificationWorkaround.checkSystemHealth();
        setIOSSystemHealth(health);
        
        addDebugLog(`🏥 System Health: ${health.healthy ? 'HEALTHY' : 'ISSUES FOUND'}`);
        if (health.issues.length > 0) {
          health.issues.forEach(issue => addDebugLog(`⚠️ Issue: ${issue}`));
          health.recommendations.forEach(rec => addDebugLog(`💡 Recommendation: ${rec}`));
        }
      } catch (healthError) {
        addDebugLog(`⚠️ iOS health check failed: ${healthError}`);
        health = { healthy: false, issues: ['Health check failed'], recommendations: ['Try reloading the app'] };
        setIOSSystemHealth(health);
      }
      
      return health;
    } catch (error) {
      addDebugLog(`❌ iOS diagnosis failed: ${error}`);
      return null;
    }
  };

  // 次回通知情報を更新
  const updateNextNotificationInfo = (settings: typeof notificationSettings) => {
    if (settings.enabled) {
      const next = getNextScheduledTime({
        morning: settings.morning,
        afternoon: settings.afternoon,
        evening: settings.evening
      });
      
      if (next) {
        const minutesUntil = getMinutesUntilNext(next.nextTime);
        setNextNotification({
          nextTime: next.nextTime,
          timeType: next.timeType,
          minutesUntil
        });
      }
    } else {
      setNextNotification(null);
    }
  };

  useEffect(() => {
    // ユーザーデータを読み込み
    setUserData(getUserData());
    
    // 🔍 詳細なモバイル環境診断
    const performMobileEnvironmentDiagnosis = () => {
      addDebugLog('📱 === MOBILE ENVIRONMENT DIAGNOSIS ===');
      addDebugLog(`User Agent: ${navigator.userAgent}`);
      addDebugLog(`Platform: ${navigator.platform || 'unknown'}`);
      addDebugLog(`Language: ${navigator.language}`);
      addDebugLog(`Online: ${navigator.onLine}`);
      addDebugLog(`Screen: ${screen.width}x${screen.height}, ${screen.orientation?.type || 'unknown'}`);
      addDebugLog(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
      addDebugLog(`Device Pixel Ratio: ${window.devicePixelRatio}`);
      addDebugLog(`Touch Support: ${'ontouchstart' in window}`);
      addDebugLog(`PWA Mode: ${window.matchMedia('(display-mode: standalone)').matches}`);
      addDebugLog(`HTTPS: ${location.protocol === 'https:'}`);
      addDebugLog(`Service Worker: ${'serviceWorker' in navigator}`);
      addDebugLog(`Push Manager: ${!!(navigator.serviceWorker && (navigator as any).serviceWorker.pushManager)}`);
      addDebugLog(`Notification API: ${'Notification' in window}`);
      addDebugLog(`Permission: ${Notification.permission || 'unknown'}`);
      
      // iOS特有の診断
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      addDebugLog(`iOS Device: ${isIOS}`);
      addDebugLog(`Safari Browser: ${isSafari}`);
      
      if (isIOS) {
        addDebugLog(`iOS Version: ${(/OS (\d+)_(\d+)_?(\d+)?/.exec(navigator.userAgent) || ['', '0', '0', '0']).slice(1).join('.')}`);
        addDebugLog(`Standalone Mode: ${(navigator as any).standalone === true}`);
      }
      
      addDebugLog('📱 === END MOBILE DIAGNOSIS ===');
    };
    
    performMobileEnvironmentDiagnosis();
    
    // 通知設定を読み込み
    const saved = localStorage.getItem('studyquest_notifications');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setNotificationSettings(settings);
        addDebugLog(`💾 Loaded notification settings: ${JSON.stringify(settings)}`);
        
        // 通知が有効な場合はスケジューラーを開始
        if (settings.enabled) {
          addDebugLog('🚀 Auto-starting notification scheduler (notifications enabled)...');
          startNotificationScheduler();
          setSchedulerStatus(getSchedulerStatus());
          updateNextNotificationInfo(settings);
        }
      } catch (error) {
        addDebugLog(`❌ Failed to parse saved settings: ${error}`);
      }
    } else {
      addDebugLog('💾 No saved notification settings found');
    }

    // iOS PWA環境の初期診断
    const initializeIOSEnvironment = async () => {
      try {
        // デバイス情報取得
        const isIOS = isiOSSafariPWA();
        const isPWA = isPWAInstalled();
        const notificationSupported = isiOSNotificationSupported();
        
        setDeviceInfo({ isIOS, isPWA, notificationSupported });
        
        // PWA状態をチェック
        addDebugLog(`📱 Device Environment Details:`);
        addDebugLog(`- iOS Device: ${isIOS}`);
        addDebugLog(`- PWA Mode: ${isPWA}`);
        addDebugLog(`- Notification Support: ${notificationSupported.supported}`);
        addDebugLog(`- Support Reason: ${notificationSupported.reason || 'N/A'}`);
        
        if (isIOS) {
          if (!isPWA) {
            addDebugLog('⚠️ iOS device without PWA installation (home screen addition recommended)');
          }
          
          if (!notificationSupported.supported) {
            addDebugLog(`⚠️ iOS notification not supported: ${notificationSupported.reason}`);
            if (notificationSupported.recommendations) {
              notificationSupported.recommendations.forEach(rec => 
                addDebugLog(`💡 Recommendation: ${rec}`)
              );
            }
          }
          
          // iOS システムヘルスチェック
          await performIOSSystemDiagnosis();
        }
        
        addDebugLog('✅ iOS environment initialization completed');
      } catch (error) {
        addDebugLog(`❌ iOS environment initialization failed: ${error}`);
      }
    };

    initializeIOSEnvironment();
    
    // 🔄 5秒後に自動で設定状態をチェック
    const checkInterval = setInterval(() => {
      const currentSettings = localStorage.getItem('studyquest_notifications');
      if (currentSettings) {
        try {
          const parsed = JSON.parse(currentSettings);
          addDebugLog(`🔄 Settings check: enabled=${parsed.enabled}, times=${parsed.morning},${parsed.afternoon},${parsed.evening}`);
        } catch (e) {
          addDebugLog('❌ Settings check failed');
        }
      }
    }, 5000);
    
    return () => clearInterval(checkInterval);
  }, []);

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-4">
        <div className="max-w-md mx-auto">
          <BackButton />
          
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ⚙️ 設定
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                通知設定とアカウント情報
              </p>
            </div>

            {/* バックグラウンド通知設定 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                🔔 バックグラウンド通知
              </h2>
              
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  アプリが閉じていても指定時刻に学習リマインダーが届きます
                </p>
                
                {!notificationSettings.enabled ? (
                  <button
                    onClick={setupBackgroundNotifications}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    🚀 バックグラウンド通知を有効にする
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        ✅ バックグラウンド通知有効
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await unsubscribeFromPush();
                            const newSettings = { ...notificationSettings, enabled: false };
                            setNotificationSettings(newSettings);
                            localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
                            stopNotificationScheduler();
                            setSchedulerStatus(getSchedulerStatus());
                            setNextNotification(null);
                            addDebugLog('🔕 バックグラウンド通知を無効化しました');
                            alert('🔕 バックグラウンド通知を無効化しました');
                          } catch (error) {
                            addDebugLog(`❌ 通知無効化エラー: ${error}`);
                            alert('⚠️ 通知無効化でエラーが発生しました');
                          }
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        無効化
                      </button>
                    </div>

                    {/* 通知時刻設定 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">通知時刻設定</h3>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {/* 朝の通知 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">🌅 朝の通知</span>
                          <input
                            type="time"
                            value={notificationSettings.morning}
                            onChange={(e) => {
                              const newSettings = { 
                                ...notificationSettings, 
                                morning: e.target.value,
                                schedule: { ...notificationSettings.schedule, morning: e.target.value }
                              };
                              setNotificationSettings(newSettings);
                              localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
                              updateNextNotificationInfo(newSettings);
                              addDebugLog(`⏰ 朝の通知時刻を${e.target.value}に変更`);
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        {/* 昼の通知 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">☀️ 昼の通知</span>
                          <input
                            type="time"
                            value={notificationSettings.afternoon}
                            onChange={(e) => {
                              const newSettings = { 
                                ...notificationSettings, 
                                afternoon: e.target.value,
                                schedule: { ...notificationSettings.schedule, afternoon: e.target.value }
                              };
                              setNotificationSettings(newSettings);
                              localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
                              updateNextNotificationInfo(newSettings);
                              addDebugLog(`⏰ 昼の通知時刻を${e.target.value}に変更`);
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        {/* 夜の通知 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">🌙 夜の通知</span>
                          <input
                            type="time"
                            value={notificationSettings.evening}
                            onChange={(e) => {
                              const newSettings = { 
                                ...notificationSettings, 
                                evening: e.target.value,
                                schedule: { ...notificationSettings.schedule, evening: e.target.value }
                              };
                              setNotificationSettings(newSettings);
                              localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
                              updateNextNotificationInfo(newSettings);
                              addDebugLog(`⏰ 夜の通知時刻を${e.target.value}に変更`);
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 次回通知予定 */}
                    {nextNotification && (
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                        <div className="text-sm text-green-800 dark:text-green-200">
                          <span className="font-medium">次回通知:</span> {nextNotification.timeType} ({nextNotification.nextTime})
                          <div className="text-xs mt-1">
                            あと約 {nextNotification.minutesUntil} 分
                          </div>
                        </div>
                      </div>
                    )}

                    {/* テスト通知ボタン */}
                    <div className="space-y-2">
                      <button
                        onClick={async () => {
                          try {
                            addDebugLog('🧪 テスト通知を送信中...');
                            await sendTestNotification(
                              '📚 StudyQuest テスト通知', 
                              '通知機能が正常に動作しています！', 
                              { 
                                icon: '/icon-192x192.png',
                                badge: '/icon-96x96.png',
                                tag: 'test-notification',
                                requireInteraction: true 
                              }
                            );
                            addDebugLog('✅ テスト通知送信完了');
                            alert('📱 テスト通知を送信しました！\n\n通知が表示されない場合：\n• ブラウザの通知設定を確認\n• デバイスの通知設定を確認\n• iOS の場合はPWAモードで開く');
                          } catch (error) {
                            addDebugLog(`❌ テスト通知エラー: ${error}`);
                            alert('❌ テスト通知の送信に失敗しました。\n\nデバッグログを確認してください。');
                          }
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        🧪 テスト通知を送信
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            addDebugLog('🔄 手動スケジューラーチェック実行中...');
                            await manualSchedulerCheck();
                            addDebugLog('✅ 手動スケジューラーチェック完了');
                            alert('🔄 手動スケジューラーチェックを実行しました');
                          } catch (error) {
                            addDebugLog(`❌ 手動チェックエラー: ${error}`);
                            alert('❌ 手動チェックでエラーが発生しました');
                          }
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        🔄 手動スケジューラーチェック
                      </button>
                    </div>

                    {/* スケジューラー状態 */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>スケジューラー:</span>
                          <span className={schedulerStatus.running ? 'text-green-600' : 'text-red-600'}>
                            {schedulerStatus.running ? '実行中' : '停止中'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>チェック間隔:</span>
                          <span>{schedulerStatus.interval / 1000}秒</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ユーザー統計 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                📊 学習統計
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {userData.level}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">レベル</div>
                </div>
                
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {userData.currentStreak}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">連続日数</div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {userData.exp}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">EXP</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {userData.totalTasksCompleted}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">総タスク</div>
                </div>
              </div>
            </div>

            {/* モバイル専用診断パネル */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    addDebugLog('🔍 === モバイル詳細診断開始 ===');
                    
                    // 基本情報
                    addDebugLog(`現在時刻: ${new Date().toLocaleString('ja-JP')}`);
                    addDebugLog(`ページURL: ${window.location.href}`);
                    
                    // 通知権限状態
                    addDebugLog(`通知権限: ${Notification.permission}`);
                    
                    // Service Worker状態
                    if ('serviceWorker' in navigator) {
                      try {
                        const registration = await navigator.serviceWorker.getRegistration();
                        addDebugLog(`SW登録: ${!!registration}`);
                        if (registration) {
                          const subscription = await registration.pushManager.getSubscription();
                          addDebugLog(`プッシュ購読: ${!!subscription}`);
                          if (subscription) {
                            addDebugLog(`エンドポイント: ${subscription.endpoint.substring(0, 30)}...`);
                          }
                        }
                      } catch (error) {
                        addDebugLog(`SW確認エラー: ${error}`);
                      }
                    }
                    
                    // LocalStorage状態
                    const savedSettings = localStorage.getItem('studyquest_notifications');
                    addDebugLog(`保存設定: ${savedSettings || 'なし'}`);
                    
                    addDebugLog('🔍 === 診断完了 ===');
                    alert('📱 モバイル診断完了！デバッグログを確認してください。');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors"
                >
                  📱 モバイル診断
                </button>
                
                <button
                  onClick={() => {
                    addDebugLog('🗑️ LocalStorage and debug logs cleared');
                    localStorage.removeItem('studyquest_notifications');
                    setDebugLogs([]);
                    setNotificationSettings({
                      enabled: false,
                      morning: '07:00',
                      afternoon: '16:00',
                      evening: '20:00',
                      schedule: {
                        morning: '07:00',
                        afternoon: '16:00',
                        evening: '20:00'
                      }
                    });
                    alert('🗑️ 設定とログをリセットしました');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded transition-colors"
                >
                  🗑️ リセット
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    addDebugLog('🔄 Service Worker強制更新開始...');
                    try {
                      if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let registration of registrations) {
                          addDebugLog(`SW登録解除: ${registration.scope}`);
                          await registration.unregister();
                        }
                        addDebugLog('✅ 全SW登録解除完了');
                        
                        // 新しくService Workerを登録
                        const newReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                        addDebugLog(`✅ 新SW登録完了: ${newReg.scope}`);
                        
                        alert('🔄 Service Worker更新完了！ページを再読み込みしてください。');
                      }
                    } catch (error) {
                      addDebugLog(`❌ SW更新エラー: ${error}`);
                      alert('❌ Service Worker更新に失敗しました');
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded transition-colors"
                >
                  🔄 SW更新
                </button>
                
                <button
                  onClick={async () => {
                    addDebugLog('🗑️ キャッシュクリア開始...');
                    try {
                      // Cache API でキャッシュクリア
                      if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        for (const name of cacheNames) {
                          await caches.delete(name);
                          addDebugLog(`🗑️ キャッシュ削除: ${name}`);
                        }
                      }
                      
                      // LocalStorageクリア
                      localStorage.clear();
                      addDebugLog('🗑️ LocalStorage cleared');
                      
                      // 状態リセット
                      setNotificationSettings({
                        enabled: false,
                        morning: '07:00',
                        afternoon: '16:00',
                        evening: '20:00',
                        schedule: {
                          morning: '07:00',
                          afternoon: '16:00',
                          evening: '20:00'
                        }
                      });
                      
                      alert('🗑️ キャッシュクリア完了！ページを再読み込みしてください。');
                    } catch (error) {
                      addDebugLog(`❌ キャッシュクリアエラー: ${error}`);
                      alert('❌ キャッシュクリアに失敗しました');
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs py-2 px-3 rounded transition-colors"
                >
                  🗑️ キャッシュクリア
                </button>
              </div>
              
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-4 rounded-lg transition-colors"
              >
                🔧 デバッグログ（最新10件）
              </button>
              
              {showDebugPanel && (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono max-h-96 overflow-y-auto">
                  <div className="mb-2 text-gray-300">デバッグログ（最新10件）</div>
                  {debugLogs.map((log, index) => (
                    <div key={index} className="py-1 border-b border-gray-700">
                      {log}
                    </div>
                  ))}
                  {debugLogs.length === 0 && (
                    <div className="text-gray-500">ログはありません</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* iOS PWA インストールガイド */}
      {showPWAGuide && (
        <IOSPWAGuide 
          trigger="manual"
          onClose={() => setShowPWAGuide(false)}
        />
      )}
    </ClientOnly>
  );
}