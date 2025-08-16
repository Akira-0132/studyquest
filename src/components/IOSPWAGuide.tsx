'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isiOSSafariPWA, isPWAInstalled, isiOSNotificationSupported } from '@/lib/nativePushManager';

interface IOSPWAGuideProps {
  onClose?: () => void;
  trigger?: 'manual' | 'automatic';
}

export function IOSPWAGuide({ onClose, trigger = 'automatic' }: IOSPWAGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isPWA: false,
    notificationSupported: { supported: false, reason: '', recommendations: [] as string[] }
  });

  useEffect(() => {
    const checkDevice = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWA = isPWAInstalled();
      const notificationSupported = isiOSNotificationSupported();

      setDeviceInfo({ isIOS, isPWA, notificationSupported });

      // 自動表示の条件
      if (trigger === 'automatic' && isIOS && !isPWA) {
        const hasSeenGuide = localStorage.getItem('studyquest_pwa_guide_seen');
        if (!hasSeenGuide) {
          setShowGuide(true);
        }
      } else if (trigger === 'manual') {
        setShowGuide(true);
      }
    };

    checkDevice();
  }, [trigger]);

  const handleClose = () => {
    setShowGuide(false);
    localStorage.setItem('studyquest_pwa_guide_seen', 'true');
    onClose?.();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!showGuide) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-y-auto"
        >
          {/* ヘッダー */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                📱 iOS PWA設定ガイド
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded ${
                      step <= currentStep 
                        ? 'bg-blue-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="p-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    バックグラウンド通知を有効にしよう
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    StudyQuestをホーム画面に追加すると、アプリが閉じていても学習リマインダーが届きます。
                  </p>
                </div>

                {/* 現在の状態表示 */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">現在の状態</h4>
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
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">🌐</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Step 1: Safariで開く
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    まず、StudyQuestがSafariブラウザで開かれていることを確認してください。
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">注意</h4>
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    Chrome、Firefox、その他のブラウザではPWAインストールができません。
                    必ずSafariを使用してください。
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">確認方法</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>ブラウザのアドレスバーを確認</li>
                    <li>「Safari」と表示されているか確認</li>
                    <li>他のブラウザの場合はSafariで開き直す</li>
                  </ol>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">📤</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Step 2: 共有ボタンをタップ
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Safari下部の「共有」ボタンをタップしてください。
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">手順</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>
                      <span className="font-medium">Safari下部の共有ボタン</span>を探す
                      <div className="ml-4 mt-1 text-blue-600 dark:text-blue-400">
                        📤 (四角に上向き矢印のアイコン)
                      </div>
                    </li>
                    <li>共有ボタンをタップ</li>
                    <li>共有メニューが表示されるのを待つ</li>
                  </ol>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    💡 共有ボタンが見つからない場合は、画面を下にスクロールしてSafariのツールバーを表示してください。
                  </p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏠</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Step 3: ホーム画面に追加
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    共有メニューから「ホーム画面に追加」を選択してください。
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">手順</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>
                      共有メニューから<span className="font-medium">「ホーム画面に追加」</span>を探す
                      <div className="ml-4 mt-1 text-green-600 dark:text-green-400">
                        🏠+ (家のアイコンに+マーク)
                      </div>
                    </li>
                    <li>「ホーム画面に追加」をタップ</li>
                    <li>アプリ名を確認して「追加」をタップ</li>
                    <li>ホーム画面にStudyQuestアイコンが追加される</li>
                  </ol>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">完了後</h4>
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    ホーム画面のStudyQuestアイコンからアプリを開くと、バックグラウンド通知が利用できるようになります！
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">重要</h4>
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    通知を受け取るには、ホーム画面のアイコンからアプリを開いて通知設定を有効にしてください。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                戻る
              </button>
              
              <div className="flex space-x-2">
                {currentStep < 4 ? (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    次へ
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                  >
                    完了
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}