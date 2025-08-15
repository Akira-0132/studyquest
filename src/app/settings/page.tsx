'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import { ClientOnly } from '@/components/ClientOnly';
import { getUserData, updateUserData } from '@/lib/streakManager';
import { 
  requestOneSignalPermission, 
  updateOneSignalNotificationSettings, 
  sendOneSignalTestNotification,
  toggleOneSignalNotifications,
  getOneSignalPermissionState
} from '@/lib/oneSignalHelper';

export default function SettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    morning: '07:00',
    afternoon: '16:00',
    evening: '20:00',
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

  useEffect(() => {
    // ユーザーデータを読み込み
    setUserData(getUserData());
    
    // 通知設定を読み込み
    const saved = localStorage.getItem('studyquest_notifications');
    if (saved) {
      setNotificationSettings(JSON.parse(saved));
    }

    // OneSignal権限状態をチェック
    const checkOneSignalPermission = async () => {
      const enabled = await getOneSignalPermissionState();
      setNotificationSettings(prev => ({
        ...prev,
        enabled,
      }));
    };
    
    // 少し遅延させてOneSignalの初期化を待つ
    setTimeout(checkOneSignalPermission, 1000);

    // OneSignal購読変更イベントリスナー
    const handleSubscriptionChange = (event: CustomEvent) => {
      console.log('Subscription change event:', event.detail);
      setNotificationSettings(prev => ({
        ...prev,
        enabled: event.detail.subscribed,
      }));
    };
    
    window.addEventListener('onesignal-subscription-change', handleSubscriptionChange as any);
    
    // PWA状態をチェック
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    if (!isPWA && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      console.log('iPhoneでPWAではない状態で実行中');
    }
    
    return () => {
      window.removeEventListener('onesignal-subscription-change', handleSubscriptionChange as any);
    };
  }, []);

  const handleNotificationPermission = async () => {
    try {
      console.log('🔔 OneSignal通知権限をリクエスト中...');
      
      if (notificationSettings.enabled) {
        // 通知を無効にする場合
        const success = await toggleOneSignalNotifications(false);
        if (success) {
          const newSettings = { ...notificationSettings, enabled: false };
          setNotificationSettings(newSettings);
          localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
          alert('🔕 通知を無効にしました。');
        } else {
          alert('通知の無効化に失敗しました。');
        }
        return;
      }
      
      // 通知を有効にする場合
      const enabled = await requestOneSignalPermission();
      
      // 少し待ってから状態を再確認
      setTimeout(async () => {
        const actualState = await getOneSignalPermissionState();
        const newSettings = { ...notificationSettings, enabled: actualState };
        setNotificationSettings(newSettings);
        localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
        
        if (actualState) {
          // OneSignalの設定を更新
          await updateOneSignalNotificationSettings(newSettings);
          // テスト通知を送信
          await sendOneSignalTestNotification('🎉 OneSignal通知が有効になりました！');
          alert('✅ 通知が有効になりました！\n\n指定時刻に通知が届きます。\nバックグラウンドでも確実に動作します。');
        } else {
          alert('❌ 通知権限が拒否されました。\n\nブラウザの設定から手動で許可してください。\n\n【設定方法】\n1. ブラウザの設定を開く\n2. プライバシーとセキュリティ\n3. サイトの設定\n4. 通知\n5. このサイトを許可リストに追加');
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ 通知許可エラー:', error);
      alert(`エラーが発生しました: ${error}`);
    }
  };

  const updateNotificationTime = async (type: string, time: string) => {
    const newSettings = { ...notificationSettings, [type]: time };
    setNotificationSettings(newSettings);
    localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
    
    // OneSignalの設定を更新
    if (newSettings.enabled) {
      await updateOneSignalNotificationSettings(newSettings);
    }
  };

  // OneSignalテスト通知機能
  const handleScheduledTest = async () => {
    if (!notificationSettings.enabled) {
      alert('まず通知を有効にしてください。');
      return;
    }
    
    const success = await sendOneSignalTestNotification('⏰ OneSignalテスト通知です！バックグラウンドでも確実に届きます。');
    if (success) {
      alert('テスト通知を送信しました！\n\nアプリをバックグラウンドにしても通知が届くことを確認してください。');
    } else {
      alert('テスト通知の送信に失敗しました。');
    }
  };

  // OneSignal設定の同期
  const rescheduleNotifications = async () => {
    await updateOneSignalNotificationSettings(notificationSettings);
    alert('OneSignal通知設定を更新しました。\n\n設定した時刻に通知が届きます。');
  };

  // 詳細診断機能
  const runDiagnostics = () => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const notificationSupport = 'Notification' in window;
    const permission = notificationSupport ? Notification.permission : 'not-supported';
    const serviceWorkerSupport = 'serviceWorker' in navigator;
    
    let serviceWorkerStatus = 'not-supported';
    if (serviceWorkerSupport) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          serviceWorkerStatus = 'registered';
        } else {
          serviceWorkerStatus = 'not-registered';
        }
      });
    }
    
    const diagnosis = `
📱 デバイス情報:
• iOS: ${isIOS ? 'はい' : 'いいえ'}
• PWAモード: ${isPWA ? 'はい' : 'いいえ'}
• User Agent: ${navigator.userAgent.substring(0, 50)}...

🔔 通知機能:
• 通知API対応: ${notificationSupport ? 'はい' : 'いいえ'}
• 通知許可状態: ${permission}
• Service Worker対応: ${serviceWorkerSupport ? 'はい' : 'いいえ'}

⚙️ アプリ設定:
• 通知設定: ${notificationSettings.enabled ? 'ON' : 'OFF'}
• 朝の通知: ${notificationSettings.morning}
• 午後の通知: ${notificationSettings.afternoon}
• 夜の通知: ${notificationSettings.evening}

💡 推奨事項:
${!isPWA && isIOS ? '⚠️ PWAとしてインストールしてください' : ''}
${permission !== 'granted' ? '⚠️ 通知許可が必要です' : ''}
    `.trim();
    
    alert(diagnosis);
  };

  const resetProgress = () => {
    if (confirm('本当に進捗をリセットしますか？この操作は元に戻せません。')) {
      localStorage.removeItem('studyquest_user');
      localStorage.removeItem('studyquest_tasks');
      localStorage.removeItem('studyquest_exams');
      window.location.href = '/';
    }
  };

  const useStreakProtection = () => {
    if (userData.streakProtection > 0) {
      const { useStreakProtection } = require('@/lib/streakManager');
      if (useStreakProtection()) {
        setUserData(getUserData());
        alert('ストリーク保護券を使用しました！');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 px-4 py-6">
      <div className="max-w-md mx-auto">
        <BackButton />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-6"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              設定
            </h1>
          </div>

          {/* 通知設定 */}
          <ClientOnly fallback={
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          }>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔔 通知設定
            </h3>
            
            {/* デバッグ情報 */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
              <p className="text-blue-800 dark:text-blue-200 mb-1">
                📊 通知システム状態
              </p>
              <p className="text-blue-600 dark:text-blue-300">
                OneSignal: {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ? '✅ 設定済み' : '❌ 未設定'}
              </p>
              <p className="text-blue-600 dark:text-blue-300">
                通知権限: {notificationSettings.enabled ? '✅ 許可' : '⏸️ 未許可'}
              </p>
              <p className="text-blue-600 dark:text-blue-300">
                ブラウザ権限: {typeof window !== 'undefined' && 'Notification' in window ? 
                  (Notification.permission === 'granted' ? '✅ 許可' : 
                   Notification.permission === 'denied' ? '❌ 拒否' : '⏸️ 未設定') : 
                  '❓ 不明'}
              </p>
              {!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && (
                <p className="text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Vercel環境変数にOneSignal App IDを設定してください
                </p>
              )}
              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
                <p className="text-orange-600 dark:text-orange-400 mt-2">
                  ⚠️ ブラウザで通知が拒否されています。ブラウザの設定で許可してください。
                </p>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">プッシュ通知</span>
                <button
                  onClick={handleNotificationPermission}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    notificationSettings.enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {notificationSettings.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {notificationSettings.enabled && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="mb-3">
                      <button
                        onClick={handleScheduledTest}
                        className="w-full px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
                      >
                        📱 OneSignalテスト通知
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        ※OneSignal経由で通知が届くか確認できます
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">朝の通知</span>
                        <input
                          type="time"
                          value={notificationSettings.morning}
                          onChange={(e) => updateNotificationTime('morning', e.target.value)}
                          className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">午後の通知</span>
                        <input
                          type="time"
                          value={notificationSettings.afternoon}
                          onChange={(e) => updateNotificationTime('afternoon', e.target.value)}
                          className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">夜の通知</span>
                        <input
                          type="time"
                          value={notificationSettings.evening}
                          onChange={(e) => updateNotificationTime('evening', e.target.value)}
                          className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      
                      <button
                        onClick={rescheduleNotifications}
                        className="w-full px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors mt-3"
                      >
                        🔄 通知を再スケジュール
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        ※時刻を変更した後にタップしてください
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* アカウント情報 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              👤 アカウント情報
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">レベル</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userData.level}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">経験値</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userData.exp} EXP</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">現在のストリーク</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userData.currentStreak}日</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">最大ストリーク</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userData.maxStreak}日</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">完了タスク数</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userData.totalTasksCompleted}</span>
              </div>
            </div>
          </div>

          {/* ストリーク保護 */}
          {userData.streakProtection > 0 && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-2">
                🛡️ ストリーク保護券
              </h3>
              <p className="text-sm opacity-90 mb-4">
                体調不良などでストリークが途切れそうな時に使用できます
              </p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">保有数: {userData.streakProtection}枚</span>
                <button
                  onClick={useStreakProtection}
                  className="px-4 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors"
                >
                  使用する
                </button>
              </div>
            </div>
          )}

          {/* バッジ */}
          {userData.badges.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🏆 獲得バッジ
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {userData.badges.map((badge, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-2xl">
                      {badge.includes('bronze') ? '🥉' : 
                       badge.includes('silver') ? '🥈' : 
                       badge.includes('gold') ? '🥇' : 
                       badge.includes('platinum') ? '💎' : '🎖️'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {badge.includes('bronze') ? '3日連続' : 
                       badge.includes('silver') ? '1週間連続' : 
                       badge.includes('gold') ? '2週間連続' : 
                       badge.includes('platinum') ? '1ヶ月連続' : 'バッジ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* リセット */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔄 データ管理
            </h3>
            <button
              onClick={resetProgress}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              全データをリセット
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ※この操作は元に戻せません
            </p>
          </div>
          </ClientOnly>
        </motion.div>
      </div>
    </div>
  );
}