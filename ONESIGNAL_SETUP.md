# OneSignal セットアップガイド

StudyQuestにOneSignalを統合するための手順です。

## 1. OneSignalアカウントの作成

1. [OneSignal](https://onesignal.com)にアクセス
2. 無料アカウントを作成
3. ログイン

## 2. アプリの作成

1. ダッシュボードで「New App/Website」をクリック
2. アプリ名: `StudyQuest`
3. プラットフォーム: `Web Push`を選択

## 3. Web設定

### サイト設定
- **Site Name**: StudyQuest
- **Site URL**: https://studyquest.vercel.app
- **Auto Resubscribe**: ON（推奨）
- **Default Notification Icon URL**: https://studyquest.vercel.app/icon-192x192.png

### 許可プロンプト設定
- **Prompt Type**: Slide Prompt（推奨）
- **Prompt Text**: 「StudyQuestから学習リマインダーを受け取りますか？」

## 4. アプリIDとAPIキーの取得

設定完了後、以下の情報をメモ：
- **App ID**: （OneSignalダッシュボードから取得）
- **Safari Web ID**: （Safari用、オプション）

## 5. 環境変数の設定

`.env.local`ファイルに追加：

```
NEXT_PUBLIC_ONESIGNAL_APP_ID=あなたのApp ID
```

## 6. デプロイ環境への設定

Vercelの環境変数に追加：
1. Vercelダッシュボードにログイン
2. プロジェクトの設定 → Environment Variables
3. `NEXT_PUBLIC_ONESIGNAL_APP_ID`を追加

## 注意事項

- OneSignalの無料プランでは月10,000通知まで無料
- iOS PWAでのバックグラウンド通知が確実に動作
- 詳細な分析機能が利用可能