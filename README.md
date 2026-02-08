# くすりログ - 服薬管理・リマインドアプリ

家族・少人数向けの服薬管理Webアプリケーションです。薬の服薬スケジュールを登録し、LINE経由でリマインド通知を受け取り、LINEから「飲んだ」と返信するだけで服薬記録ができます。服薬履歴はカレンダー形式で可視化します。

## 主な機能

- **薬の管理**: 薬の追加・編集・削除・一時停止。毎日/特定曜日/n日おきのスケジュール設定
- **服薬記録**: Webまたは LINE から服薬を記録
- **LINE リマインド**: 設定した時刻にLINEでリマインド通知。「飲んだ」と返信で記録完了
- **カレンダー表示**: 月表示のカレンダーで服薬履歴を可視化。服薬率も確認可能
- **家族共有**: 招待コードで家族メンバーを追加。閲覧者/管理者の権限管理

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **言語**: TypeScript
- **DB**: Turso (libSQL) + Drizzle ORM
- **認証**: NextAuth.js v4 (Credentials Provider)
- **LINE連携**: LINE Messaging API (`@line/bot-sdk`)
- **スタイリング**: Tailwind CSS
- **日付処理**: date-fns
- **バリデーション**: Zod
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、各項目を設定してください。

```bash
cp .env.example .env.local
```

| 変数名 | 説明 |
|---|---|
| `TURSO_DATABASE_URL` | Turso データベースURL |
| `TURSO_AUTH_TOKEN` | Turso 認証トークン |
| `NEXTAUTH_URL` | アプリケーションURL (ローカルは `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | NextAuth シークレットキー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API チャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | LINE Messaging API チャネルシークレット |
| `CRON_SECRET` | Cronジョブの認証シークレット |

### 3. Turso データベースの準備

[Turso](https://turso.tech/) でデータベースを作成し、URLとトークンを環境変数に設定してください。ローカル開発時は `file:local.db` が使用されます（SQLiteファイル）。

テーブルはアプリケーション起動時に自動作成されます。

### 4. LINE Messaging API の設定

1. [LINE Developers](https://developers.line.biz/) でプロバイダーとチャネルを作成
2. Messaging API チャネルのアクセストークンとシークレットを取得
3. Webhook URL に `https://your-domain.com/api/line/webhook` を設定
4. Webhook の利用をオンに設定

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセスできます。

## デプロイ (Vercel)

1. Vercel にリポジトリを接続
2. 環境変数を設定
3. デプロイ

### リマインド定期実行 (GitHub Actions)

リマインド通知は GitHub Actions で5分間隔に実行されます（`.github/workflows/remind.yml`）。

リポジトリの **Settings > Secrets and variables > Actions** で以下の Secrets を追加してください：

| Secret 名 | 値 |
|---|---|
| `APP_URL` | デプロイ先URL（例: `https://your-app.vercel.app`） |
| `CRON_SECRET` | Vercelの環境変数 `CRON_SECRET` と同じ値 |

## LINE連携の使い方

1. アプリの設定画面で「連携コードを発行」ボタンを押す
2. 表示された6桁のコードをLINE公式アカウントに送信
3. 連携完了のメッセージが届いたら設定完了
4. 設定した時刻にリマインドが届きます
5. 「飲んだ」と返信すると服薬記録が完了

## ライセンス

MIT
