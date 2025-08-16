'use client';

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
import { scheduleNotifications } from '@/lib/pushNotificationManager';
import { iosNotificationWorkaround } from '@/lib/iosNotificationWorkaround';
import { IOSPWAGuide } from '@/components/IOSPWAGuide';

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

  // コンソールログをオーバーライド
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      addDebugLog('LOG: ' + args.join(' '));
    };
    
    console.error = (...args) => {
      originalError(...args);
      addDebugLog('ERROR: ' + args.join(' '));
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

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
      const health = await iosNotificationWorkaround.checkSystemHealth();
      setIOSSystemHealth(health);
      
      addDebugLog(`🏥 System Health: ${health.healthy ? 'HEALTHY' : 'ISSUES FOUND'}`);
      if (health.issues.length > 0) {
        health.issues.forEach(issue => addDebugLog(`⚠️ Issue: ${issue}`));
        health.recommendations.forEach(rec => addDebugLog(`💡 Recommendation: ${rec}`));
      }
      
      return health;
    } catch (error) {
      addDebugLog(`❌ iOS diagnosis failed: ${error}`);
      return null;
    }
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
          alert('📱 iOSでバックグラウンド通知を利用するには、アプリをホーム画面に追加する必要があります。\\n\\nガイドを表示しますか？');
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
        alert(`❌ iOS通知要件が満たされていません。\\n\\n原因: ${deviceInfo.notificationSupported.reason}\\n\\n推奨解決策:\\n${deviceInfo.notificationSupported.recommendations?.join('\\n')}`);
        return false;
      }
      
      // 権限リクエスト
      addDebugLog('📋 Step 1: 通知権限リクエスト');
      const permission = await Notification.requestPermission();
      addDebugLog(`📋 通知権限結果: ${permission}`);
      
      if (permission !== 'granted') {
        addDebugLog('❌ 通知権限が拒否されました');
        const errorMessage = deviceInfo.isIOS 
          ? '❌ 通知権限が必要です。\\n\\n【iOS解決方法】\\n1. 設定 → Safari → Webサイト → 通知\\n2. このサイトを「許可」に設定\\n3. アプリを再起動'
          : '❌ 通知権限が必要です。\\n\\n【解決方法】\\n1. ブラウザの設定を開く\\n2. このサイトの通知を「許可」に設定\\n3. ページを再読み込み';
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
          alert('iOS Safari固有の問題が発生しました。\\n\\n回避策:\\n1. アプリを完全に閉じる\\n2. Safariを再起動\\n3. ホーム画面からアプリを開き直す\\n4. 再度通知設定を試す');
          return false;
        }
        
        throw error;
      }
      
      if (!subscription) {
        addDebugLog('❌ プッシュ購読作成に失敗');
        const errorMessage = deviceInfo.isIOS
          ? '❌ iOS プッシュ通知の購読に失敗しました。\\n\\n【iOS対策】\\n- Safari/PWAを完全に再起動\\n- ホーム画面からアプリを開く\\n- iOS 16.4以降であることを確認\\n\\nデバッグログで詳細を確認してください。'
          : '❌ プッシュ通知の購読に失敗しました。\\n\\n【考えられる原因】\\n- Service Workerの問題\\n- VAPIDキーの問題\\n\\nデバッグログを確認してください。';
        alert(errorMessage);
        return false;
      }
      
      addDebugLog('✅ プッシュ購読作成完了');
      addDebugLog(`📝 Subscription endpoint: ${subscription.endpoint.substring(0, 30)}...`);
      
      // スケジュール設定
      addDebugLog('📋 Step 3: スケジュール通知設定');
      try {
        await scheduleNotifications();
        const success = true;
        if (success) {
          addDebugLog('✅ スケジュール通知設定完了');
          
          // 状態更新
          const newSettings = { ...notificationSettings, enabled: true };
          setNotificationSettings(newSettings);
          localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
          
          addDebugLog('🎉 バックグラウンド通知システム有効化完了');
          alert('🎉 バックグラウンド通知が設定されました！\\n\\n✅ アプリが閉じていても指定時刻に通知が届きます\\n✅ テスト通知ボタンで動作確認できます');
          return true;
        } else {
          addDebugLog('❌ スケジュール設定に失敗');
          alert('⚠️ スケジュール設定に失敗しましたが、\\nプッシュ購読は成功しました。\\nテスト通知は利用できます。');
          return false;
        }
      } catch (scheduleError) {
        addDebugLog(`❌ スケジュール設定エラー: ${scheduleError}`);
        alert('⚠️ スケジュール設定でエラーが発生しましたが、\\nプッシュ購読は成功しました。\\nテスト通知は利用できます。');
        return false;
      }
      
    } catch (error) {
      addDebugLog(`❌ セットアップ全般エラー: ${error}`);
      addDebugLog(`❌ エラー詳細: ${JSON.stringify({
        name: (error as Error).name,
        message: (error as Error).message
      })}`);
      
      alert('❌ バックグラウンド通知のセットアップに失敗しました。\\n\\nデバッグログで詳細を確認してください。');
      return false;
    }
  };

  // テスト通知送信（iOS対応強化版）
  const sendTestPushNotification = async () => {
    addDebugLog('🧪 テスト通知送信中（iOS対応版）...');
    
    try {
      // iOS事前チェック
      if (deviceInfo.isIOS) {
        const health = await performIOSSystemDiagnosis();
        if (health && !health.healthy) {
          addDebugLog('⚠️ iOS system issues detected for test notification');
          // フォールバック機能を使用
          const fallbackSuccess = await iosNotificationWorkaround.sendNotificationWithRetry(
            '🧪 StudyQuest テスト通知（iOS対応）',
            'iOS PWA通知システムが動作しています！バックグラウンドでも通知が届きます。',
            { requireInteraction: true }
          );
          
          if (fallbackSuccess) {
            addDebugLog('✅ iOS fallback test notification sent');
            alert('🧪 iOS対応テスト通知を送信しました！\\n\\n📱 アプリをバックグラウンドにしても通知が届くことを確認してください。\\n\\n⚠️ iOS特有の制限により、フォールバック機能を使用しました。');
          } else {
            addDebugLog('❌ iOS fallback test notification failed');
            alert('❌ iOS テスト通知の送信に失敗しました。\\n\\n対策：\\n1. Safari/PWAを再起動\\n2. 通知権限を確認\\n3. PWAがホーム画面からインストールされているか確認');
          }
          return;
        }
      }
      
      // 標準テスト通知
      const success = await sendTestNotification(
        '🚀 StudyQuest テスト通知',
        'バックグラウンド通知が正常に動作しています！アプリを閉じても通知が届きます。'
      );
      
      if (success) {
        addDebugLog('✅ テスト通知送信成功');
        const message = deviceInfo.isIOS 
          ? 'テスト通知を送信しました！\\n\\n📱 iOSでは以下をご確認ください：\\n・ホーム画面からアプリを開いている\\n・通知権限が許可されている\\n・アプリをバックグラウンドにしても通知が届く'
          : 'テスト通知を送信しました！\\n\\nアプリをバックグラウンドにしても通知が届くことを確認してください。';
        alert(message);
      } else {
        addDebugLog('❌ テスト通知送信失敗');
        const errorMessage = deviceInfo.isIOS
          ? '❌ iOS テスト通知の送信に失敗しました。\\n\\n対策：\\n1. PWAをホーム画面からインストール\\n2. Safari/PWAを再起動\\n3. 通知権限を再確認'
          : '❌ テスト通知の送信に失敗しました。\\n\\n通知設定と権限を確認してください。';
        alert(errorMessage);
      }
    } catch (error) {
      addDebugLog(`❌ テスト通知エラー: ${error}`);
      
      // iOS特有のエラー処理
      if (deviceInfo.isIOS && (error as Error).message.includes('iOS')) {
        alert('❌ iOS Safari固有のエラーが発生しました。\\n\\n回避策を試してください：\\n1. アプリを完全に閉じる\\n2. Safariを再起動\\n3. ホーム画面からアプリを開く\\n4. 通知設定をやり直す');
      } else {
        alert(`❌ テスト通知エラー: ${error}`);
      }
    }
  };

  // スケジュール通知を手動でトリガー（テスト用）
  const triggerScheduledNotification = async (timeType: string) => {
    addDebugLog(`⏰ ${timeType}のスケジュール通知をトリガー中...`);
    
    try {
      const subscription = await getActiveSubscription();
      if (!subscription) {
        addDebugLog('❌ アクティブな購読がありません');
        alert('先に通知を有効にしてください');
        return;
      }

      // iOS対応: 安全なサブスクリプション変換を使用
      let subscriptionData;
      try {
        // 先ほど作成したsafeSubscriptionToJSON関数と同じロジックを使用
        addDebugLog('🔄 Converting subscription to JSON (iOS safe version)...');
        subscriptionData = subscription.toJSON();
        addDebugLog('✅ Standard toJSON() conversion successful');
      } catch (jsonError) {
        addDebugLog(`⚠️ Standard toJSON() failed, using manual conversion: ${jsonError}`);
        
        // iOS Safari PWA バグ回避: 手動でオブジェクトを構築
        try {
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
          
          addDebugLog('🔧 Manual subscription object constructed successfully');
          addDebugLog(`- Endpoint length: ${subscriptionData.endpoint.length}`);
          addDebugLog(`- p256dh key available: ${!!subscriptionData.keys.p256dh}`);
          addDebugLog(`- auth key available: ${!!subscriptionData.keys.auth}`);
        } catch (manualError) {
          addDebugLog(`❌ Manual subscription conversion also failed: ${manualError}`);
          
          // 最後の手段: 基本的な情報のみ
          subscriptionData = {
            endpoint: subscription.endpoint || '',
            keys: {
              p256dh: '',
              auth: ''
            }
          };
          
          addDebugLog('🚨 Using fallback subscription data (keys may be missing)');
        }
      }

      const response = await fetch('/api/trigger-scheduled-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscriptionData,
          timeType: timeType
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        addDebugLog(`✅ ${timeType}のスケジュール通知送信成功`);
        alert(`${timeType}のスケジュール通知を送信しました！\\n\\nこれは実際の時刻に送信される通知と同じものです。`);
      } else {
        addDebugLog(`❌ スケジュール通知送信失敗: ${result.error}`);
        alert('スケジュール通知の送信に失敗しました。');
      }
    } catch (error) {
      addDebugLog(`❌ スケジュール通知エラー: ${error}`);
      addDebugLog(`- Error name: ${(error as Error).name}`);
      addDebugLog(`- Error message: ${(error as Error).message}`);
      
      // iOS特有のSyntaxErrorを検出
      if ((error as Error).message.includes('SyntaxError') || (error as Error).message.includes('string did not match')) {
        addDebugLog('🚨 Detected iOS Safari PWA subscription.toJSON() bug');
        alert('❌ iOS Safari固有のエラーが発生しました。\\n\\n対策：\\n1. アプリを完全に閉じる\\n2. Safariを再起動\\n3. ホーム画面からアプリを開く\\n4. 通知設定をやり直す');
      } else {
        alert(`❌ スケジュール通知エラー: ${error}`);
      }
    }
  };

  // 通知無効化
  const disableBackgroundNotifications = async () => {
    addDebugLog('🔕 バックグラウンド通知無効化中...');
    
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        addDebugLog('✅ バックグラウンド通知無効化完了');
        
        const newSettings = { ...notificationSettings, enabled: false };
        setNotificationSettings(newSettings);
        localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
        
        alert('🔕 バックグラウンド通知を無効にしました。');
      } else {
        addDebugLog('❌ バックグラウンド通知無効化失敗');
      }
    } catch (error) {
      addDebugLog(`❌ 通知無効化エラー: ${error}`);
    }
  };

  // 通知時刻変更
  const updateNotificationTime = async (type: string, time: string) => {
    const newSettings = { 
      ...notificationSettings, 
      [type]: time,
      schedule: {
        ...notificationSettings.schedule,
        [type]: time
      }
    };
    setNotificationSettings(newSettings);
    localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
    
    // 有効な場合は再スケジュール
    if (newSettings.enabled) {
      try {
        await scheduleNotifications();
        addDebugLog(`⏰ ${type}の通知時刻を${time}に更新`);
      } catch (error) {
        addDebugLog(`❌ 時刻更新エラー: ${error}`);
      }
    }
  };

  useEffect(() => {
    // ユーザーデータを読み込み
    setUserData(getUserData());
    
    // 通知設定を読み込み
    const saved = localStorage.getItem('studyquest_notifications');
    if (saved) {
      setNotificationSettings(JSON.parse(saved));
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
        
        // iOS向けのフォールバックスケジューラーをチェック
        if (isIOS && notificationSettings.enabled) {
          addDebugLog('🔧 Checking iOS fallback scheduler...');
          const fallbackData = localStorage.getItem('ios_notification_fallback');
          if (fallbackData) {
            addDebugLog('✅ iOS fallback scheduler found');
          } else {
            addDebugLog('📅 Setting up iOS fallback scheduler...');
            await iosNotificationWorkaround.scheduleNotificationsFallback({
              morning: notificationSettings.morning,
              afternoon: notificationSettings.afternoon,
              evening: notificationSettings.evening
            });
          }
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

            {/* iOS PWA ガイドとヘルプ */}
            {deviceInfo.isIOS && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  📱 iOS PWA サポート
                </h2>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">環境チェック</h3>
                    <button
                      onClick={performIOSSystemDiagnosis}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
                    >
                      再診断
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 dark:text-blue-200">iOSデバイス</span>
                      <span className={deviceInfo.isIOS ? 'text-green-600' : 'text-red-600'}>
                        {deviceInfo.isIOS ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 dark:text-blue-200">PWAインストール</span>
                      <span className={deviceInfo.isPWA ? 'text-green-600' : 'text-red-600'}>
                        {deviceInfo.isPWA ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 dark:text-blue-200">通知対応</span>
                      <span className={deviceInfo.notificationSupported.supported ? 'text-green-600' : 'text-red-600'}>
                        {deviceInfo.notificationSupported.supported ? '✅' : '❌'}
                      </span>
                    </div>
                    {iosSystemHealth && (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-800 dark:text-blue-200">システム健全性</span>
                        <span className={iosSystemHealth.healthy ? 'text-green-600' : 'text-orange-600'}>
                          {iosSystemHealth.healthy ? '✅' : '⚠️'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {!deviceInfo.isPWA && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowPWAGuide(true)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        📱 PWAインストールガイドを表示
                      </button>
                    </div>
                  )}
                  
                  {iosSystemHealth && !iosSystemHealth.healthy && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                      <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">検出された問題</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-orange-800 dark:text-orange-200">
                        {iosSystemHealth.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                      {iosSystemHealth.recommendations.length > 0 && (
                        <>
                          <h4 className="font-medium text-orange-900 dark:text-orange-100 mt-2 mb-1">推奨解決策</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-orange-800 dark:text-orange-200">
                            {iosSystemHealth.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                      <button
                        onClick={disableBackgroundNotifications}
                        className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded"
                      >
                        無効にする
                      </button>
                    </div>
                    
                    <button
                      onClick={sendTestPushNotification}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      🧪 テスト通知を送信
                    </button>
                    
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                        📍 スケジュール通知テスト（即座に送信）
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => triggerScheduledNotification('morning')}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-1 px-2 rounded"
                        >
                          🌅 朝
                        </button>
                        <button
                          onClick={() => triggerScheduledNotification('afternoon')}
                          className="bg-orange-600 hover:bg-orange-700 text-white text-xs py-1 px-2 rounded"
                        >
                          📚 午後
                        </button>
                        <button
                          onClick={() => triggerScheduledNotification('evening')}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 px-2 rounded"
                        >
                          🌙 夜
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 通知時刻設定 */}
              {notificationSettings.enabled && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">通知時刻設定</h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">🌅 朝</span>
                      <input
                        type="time"
                        value={notificationSettings.morning}
                        onChange={(e) => updateNotificationTime('morning', e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded px-3 py-1 text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">📚 午後</span>
                      <input
                        type="time"
                        value={notificationSettings.afternoon}
                        onChange={(e) => updateNotificationTime('afternoon', e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded px-3 py-1 text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">🌙 夜</span>
                      <input
                        type="time"
                        value={notificationSettings.evening}
                        onChange={(e) => updateNotificationTime('evening', e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded px-3 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
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