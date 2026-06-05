# アーキテクチャ

## システム概要

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  ブラウザ    │────▶│  Next.js     │────▶│  Turso DB   │
│ (React SPA) │◀────│  API Routes  │◀────│  (libSQL)   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │  LINE API    │
                    │  (Webhook /  │
                    │   Push Msg)  │
                    └──────────────┘

┌──────────────────┐
│  GitHub Actions  │──▶ /api/cron/remind (5分間隔)
└──────────────────┘
```

## ファイル構成

### `src/app/` — ページ・APIルート

| パス | 種別 | 説明 |
|---|---|---|
| `page.tsx` | リダイレクト | `/dashboard` に転送 |
| `layout.tsx` | レイアウト | Providers + Header + フォント読み込み |
| `login/page.tsx` | ページ | ログインフォーム（Client Component） |
| `register/page.tsx` | ページ | 新規登録フォーム（Client Component） |
| `dashboard/page.tsx` | ページ | 今日の服薬状況一覧 |
| `medications/page.tsx` | ページ | 薬のCRUD管理 |
| `calendar/page.tsx` | ページ | 月別カレンダー + 日別詳細モーダル |
| `settings/page.tsx` | ページ | LINE連携・家族共有・プロフィール |
| `api/auth/[...nextauth]/route.ts` | API | NextAuth ハンドラ |
| `api/auth/register/route.ts` | API | ユーザー登録 |
| `api/medications/route.ts` | API | 薬一覧取得 (GET) / 新規登録 (POST) |
| `api/medications/[id]/route.ts` | API | 薬更新 (PUT) / 削除 (DELETE) |
| `api/logs/route.ts` | API | 服薬予定＋実績の取得 (GET) / 服薬記録の upsert (POST) |
| `api/line/webhook/route.ts` | API | LINE Webhook受信・服薬記録 |
| `api/line/link/route.ts` | API | LINE連携コード発行 |
| `api/cron/remind/route.ts` | API | リマインド送信（定期実行） |
| `api/family/route.ts` | API | 家族一覧 (GET) / 招待コード発行 (POST) |
| `api/family/invite/route.ts` | API | 招待コードで参加 (POST) |

### `src/components/` — UIコンポーネント

| ファイル | 説明 | 使用ページ |
|---|---|---|
| `Providers.tsx` | NextAuth SessionProvider ラッパー | layout.tsx |
| `Header.tsx` | ナビゲーションバー（レスポンシブ） | layout.tsx |
| `MedicationCard.tsx` | 薬カード + 服薬/スキップボタン | dashboard |
| `MedicationForm.tsx` | 薬の登録/編集フォーム | medications |
| `Calendar.tsx` | 月表示カレンダー + 服薬率表示 | calendar |
| `DayDetail.tsx` | 日付クリック時の詳細モーダル | calendar |
| `LineConnect.tsx` | LINE連携コード発行UI | settings |
| `FamilyList.tsx` | 家族メンバー一覧 + 招待UI | settings |

### `src/lib/` — ビジネスロジック・インフラ

| ファイル | 説明 |
|---|---|
| `schema.ts` | Drizzle ORM スキーマ定義（5テーブル） |
| `db.ts` | Turso クライアント初期化 + `initializeDatabase()` |
| `auth.ts` | NextAuth設定（Credentials Provider, JWT） |
| `auth-helpers.ts` | `getSession()`, `getCurrentUserId()` |
| `line.ts` | LINE SDK クライアント・署名検証・メッセージ送受信 |
| `utils.ts` | 日付処理（JST変換）、スケジュール判定、コード生成 |
| `occurrences.ts` | 服薬予定の算出（仮想オカレンス）・ビュー生成・服薬記録の upsert |

## 服薬予定の算出（仮想オカレンス）

服薬予定は `medication_logs` に行として保存せず、`medications` のスケジュール定義
（`scheduleType` / `scheduleTimes` / `scheduleDays` / `scheduleInterval` / 期間）から
**取得時に算出**する。`medication_logs` には実際に記録されたイベント（taken/skipped）
だけが入る。

```
GET /api/logs?startDate=&endDate=
  └─ buildLogView() (occurrences.ts)
       1. computeOccurrences(): 薬のスケジュールから期間内の予定枠を算出
       2. medication_logs から保存済みイベント（taken/skipped）を取得
       3. 枠に記録があれば実績を、無ければ導出（過去=missed / 当日・未来=pending）
       4. 予定外の過去の記録も履歴として残す

POST /api/logs（服薬記録・スキップ）
  └─ recordDose(): (userId, medicationId, scheduledAt) を自然キーに upsert
```

この設計により、薬の登録・スケジュール編集が即座に予定へ反映され、予定生成用の
バッチ処理が不要になる（cron はリマインド送信のみを担当）。

## レイアウト階層

```
RootLayout (layout.tsx)
  ├─ <link> Google Fonts (Noto Sans JP)
  ├─ Providers (SessionProvider)
  │   ├─ Header (認証時のみ表示)
  │   └─ <main>
  │       ├─ login/register (認証不要)
  │       └─ dashboard/medications/calendar/settings (認証必要)
```

## 認証フロー

```
未認証 → /login → POST /api/auth/callback/credentials → JWT発行 → /dashboard
                   └─ 失敗: エラー表示

新規登録 → /register → POST /api/auth/register → 自動ログイン → /dashboard
```

- JWT ベースのセッション管理（サーバーサイドのセッションストア不要）
- 各ページは `useSession()` でクライアント側チェック
- 各API は `getCurrentUserId()` でサーバー側チェック
- NextAuth の `pages.signIn: "/login"` で未認証時リダイレクト

## LINE連携フロー

```
1. ユーザー: /settings → 「連携コードを発行」
2. サーバー: POST /api/line/link → 6桁コード生成（メモリ保存、10分有効）
3. ユーザー: LINEでコードを送信
4. LINE: POST /api/line/webhook → コード照合 → users.lineUserId 更新
5. 以降: Cronリマインド → LINE Push Message → ユーザー返信 → 服薬記録
```

## リマインド処理フロー

```
GitHub Actions (5分間隔)
  └─ GET /api/cron/remind (Authorization: Bearer CRON_SECRET)
      ├─ lineUserId が設定済みの全ユーザーを取得
      ├─ 各ユーザーのアクティブな薬を取得
      ├─ 現在時刻と scheduleTimes を照合（5分ウィンドウ）
      ├─ その枠に taken/skipped 記録が無ければ通知対象とする（DB書き込みなし）
      └─ LINE Push Message で通知
```

## ダークモード

- `globals.css` の `@media (prefers-color-scheme: dark)` でシステム設定に追従
- 各コンポーネントで `dark:` プレフィックスのTailwindクラスを使用
- ダークモード用カラー: `bg-dark (#1A1A2E)`, `surface-dark (#16213E)`, `text-dark (#E8E8E8)`
