'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import { ClientOnly } from '@/components/ClientOnly';
import { getUserData, updateUserData } from '@/lib/streakManager';
import { scheduleLocalNotifications, testScheduledNotification, testServiceWorkerNotification } from '@/lib/notificationHelper';
import { requestNotificationPermission, subscribeToPushNotifications } from '@/lib/pushNotificationManager';

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

    // 通知権限をチェック
    if ('Notification' in window) {
      setNotificationSettings(prev => ({
        ...prev,
        enabled: Notification.permission === 'granted',
      }));
    }

    // PWA状態をチェック
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    if (!isPWA && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      console.log('iPhoneでPWAではない状態で実行中');
    }
  }, []);

  const handleNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        console.log('現在の通知許可状態:', Notification.permission);
        const permission = await requestNotificationPermission();
        console.log('リクエスト後の通知許可状態:', permission);
        
        const enabled = permission === 'granted';
        
        const newSettings = { ...notificationSettings, enabled };
        setNotificationSettings(newSettings);
        localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
        
        if (enabled) {
          // Push通知を購読
          await subscribeToPushNotifications();
          // 通知を有効にした場合、スケジューリングを開始
          await scheduleLocalNotifications();
          // テスト通知を即座に表示
          await scheduleLocalNotifications(true);
          alert('通知が有効になりました！\n\n指定時刻に通知が届きます。\nバックグラウンドでも動作します。');
        } else {
          alert(`通知許可が拒否されました。状態: ${permission}\nブラウザの設定から手動で許可してください。`);
        }
      } catch (error) {
        console.error('通知許可エラー:', error);
        alert(`エラーが発生しました: ${error}`);
      }
    } else {
      alert('このブラウザは通知をサポートしていません。\n\niPhoneの場合：\n1. Safariを使用してください\n2. 「ホーム画面に追加」でPWAとしてインストールしてください\n3. iOS 16.4以降が必要です');
    }
  };

  const updateNotificationTime = async (type: string, time: string) => {
    const newSettings = { ...notificationSettings, [type]: time };
    setNotificationSettings(newSettings);
    localStorage.setItem('studyquest_notifications', JSON.stringify(newSettings));
    
    // 設定変更時に通知を再スケジュール
    if (newSettings.enabled) {
      await scheduleLocalNotifications();
    }
  };

  // 1分後に通知を送るテスト機能
  const handleScheduledTest = async () => {
    if (!notificationSettings.enabled) {
      alert('まず通知を有効にしてください。');
      return;
    }
    
    const success = await testScheduledNotification();
    if (success) {
      alert('1分後にテスト通知を送信します。\n\nアプリをバックグラウンドにしても通知が届くか確認してください。');
    }
  };

  // 定期通知の再スケジュール
  const rescheduleNotifications = async () => {
    await scheduleLocalNotifications();
    alert('定期通知を再スケジュールしました。\n\n設定した時刻に通知が届きます。');
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
                        ⏰ 1分後にテスト通知
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        ※定期通知が正しく動作するか確認できます
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