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
    
    // 通知設定を読み込み
    const saved = localStorage.getItem('studyquest_notifications');
    if (saved) {
      const settings = JSON.parse(saved);
      setNotificationSettings(settings);
      
      // 通知が有効な場合はスケジューラーを開始
      if (settings.enabled) {
        addDebugLog('🚀 Auto-starting notification scheduler (notifications enabled)...');
        startNotificationScheduler();
        setSchedulerStatus(getSchedulerStatus());
        updateNextNotificationInfo(settings);
      }
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
        addDebugLog(`📱 Device Environment:`);
        addDebugLog(`- iOS Device: ${isIOS}`);
        addDebugLog(`- PWA Mode: ${isPWA}`);
        addDebugLog(`- Notification Support: ${notificationSupported.supported}`);
        
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        ✅ 有効
                      </span>
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

            {/* デバッグパネル */}
            <div className="space-y-4">
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