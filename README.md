# StudyQuest - 中学生向け試験対策アプリ

ゲーミフィケーションで楽しく勉強できる中学生向け試験対策アプリです。

## ✨ 特徴

- 📚 **自動スケジュール生成**: 試験日から逆算して学習計画を自動作成
- 🎮 **ゲーミフィケーション**: ストリーク、経験値、レベル、バッジで継続をサポート
- 📱 **PWA対応**: オフライン利用可能、ホーム画面に追加可能
- 🔔 **スマート通知**: 学習リマインダー機能
- 🌙 **ダークモード**: 夜の勉強にも目に優しい
- 📲 **モバイルファースト**: スマートフォンでの使用を想定

## 🚀 主な機能

### Phase 1 (MVP)
- [x] 試験情報登録と管理
- [x] 自動スケジュール生成
- [x] タスク管理とチェック機能
- [x] ストリークシステム（連続学習日数）
- [x] 経験値とレベルシステム
- [x] バッジ獲得システム
- [x] プッシュ通知機能
- [x] PWA対応

## 🛠️ 技術スタック

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Storage**: LocalStorage (MVP), Supabase (Phase 2)
- **PWA**: Service Worker + Web App Manifest

## 🎯 使い方

1. **試験登録**: ➕ボタンから試験情報を登録
2. **学習実行**: ホーム画面で今日のタスクをチェック
3. **進捗確認**: 📅でスケジュールと進捗を確認
4. **設定**: ⚙️で通知やアカウント情報を管理

## 🚀 開発・デプロイ

### ローカル開発

```bash
npm install
npm run dev
```

### ビルド

```bash
npm run build
npm start
```

## 📝 今後の予定 (Phase 2)

- [ ] OCR機能（試験範囲表の写真読み取り）
- [ ] スタディペットシステム
- [ ] 友達機能とランキング
- [ ] LINE通知連携
- [ ] Supabaseでのデータ同期

## 📄 ライセンス

MIT License

---

🤖 Generated with [Claude Code](https://claude.ai/code)
