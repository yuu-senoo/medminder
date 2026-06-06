# 開発ガイド

## 環境セットアップ

### 前提条件

- Node.js 18+
- npm

### 初回セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local を編集して環境変数を設定
npm run dev
```

ローカル開発では `TURSO_DATABASE_URL` を設定しなければ `file:local.db`（SQLiteファイル）が自動使用される。DB・LINE連携なしでもUI開発は可能。

### 環境変数

| 変数 | ローカル開発で必須 | 説明 |
|---|---|---|
| `NEXTAUTH_URL` | はい | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | はい | `openssl rand -base64 32` で生成 |
| `TURSO_DATABASE_URL` | いいえ | 未設定で `file:local.db` にフォールバック |
| `TURSO_AUTH_TOKEN` | いいえ | ローカルDB使用時は不要 |
| `LINE_CHANNEL_ACCESS_TOKEN` | いいえ | LINE連携テスト時のみ |
| `LINE_CHANNEL_SECRET` | いいえ | LINE連携テスト時のみ |
| `CRON_SECRET` | いいえ | Cronテスト時のみ |

最小構成（UI開発のみ）:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-change-in-production
```

## コーディング規約

### ファイル配置ルール

| 種別 | 配置先 | 例 |
|---|---|---|
| ページ | `src/app/{path}/page.tsx` | `src/app/dashboard/page.tsx` |
| APIルート | `src/app/api/{path}/route.ts` | `src/app/api/medications/route.ts` |
| コンポーネント | `src/components/{Name}.tsx` | `src/components/MedicationCard.tsx` |
| ライブラリ | `src/lib/{name}.ts` | `src/lib/utils.ts` |
| 型定義 | `src/types/{name}.d.ts` | `src/types/next-auth.d.ts` |

### APIルートの実装パターン

全APIルートは以下の順序で処理する:

```typescript
import { db, initializeDatabase } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    await initializeDatabase();                   // 1. DB初期化（テーブル存在確認）
    const userId = await getCurrentUserId();       // 2. 認証チェック
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);         // 3. Zodバリデーション
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message }, // issues (v4), NOT errors (v3)
        { status: 400 }
      );
    }

    // 4. ビジネスロジック
    // 5. レスポンス
  } catch (error) {
    console.error("Context:", error);              // 6. エラーハンドリング
    return NextResponse.json({ error: "日本語メッセージ" }, { status: 500 });
  }
}
```

### 動的ルートパラメータ（Next.js 16）

```typescript
// params は Promise なので await が必要
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### Drizzle ORM クエリパターン

```typescript
// 単一レコード取得
const user = await db.select().from(users).where(eq(users.id, id)).get();

// 全件取得
const all = await db.select().from(medications).where(eq(medications.userId, userId)).all();

// 挿入
await db.insert(users).values({ id, email, name, passwordHash, createdAt });

// 更新
await db.update(users).set({ lineUserId }).where(eq(users.id, id));

// 削除
await db.delete(medications).where(eq(medications.id, id));

// NOT NULL 条件 (.not() は使えない)
import { isNotNull } from "drizzle-orm";
await db.select().from(users).where(isNotNull(users.lineUserId)).all();
```

### Tailwind CSS v4 スタイリング

カスタムカラーは `src/app/globals.css` の `@theme inline {}` で定義済み:

```css
@theme inline {
  --color-primary: #4A90A4;
  --color-primary-dark: #3A7A8E;
  --color-accent: #F5A623;
  --color-success: #7BC67E;
  --color-warning: #F5D76E;
  --color-danger: #E07575;
  --color-bg-light: #F8F9FA;
  --color-bg-dark: #1A1A2E;
  --color-surface-dark: #16213E;
  --color-text-dark: #E8E8E8;
}
```

使用例: `bg-primary`, `text-danger`, `dark:bg-surface-dark`

### 日付処理

全てJST (Asia/Tokyo) で処理。`src/lib/utils.ts` のヘルパーを使用:

```typescript
import { nowJST, todayJST, formatDateJST, shouldTakeMedicationOnDate } from "@/lib/utils";

nowJST()                                // 現在時刻 (Date, JST)
todayJST()                              // 今日の日付 "YYYY-MM-DD"
formatDateJST(date, "HH:mm")            // "08:00"
shouldTakeMedicationOnDate(med, "2026-02-08")  // boolean
```

## よくあるエラーと対処

### `parsed.error.errors is not a function`
Zod v4 では `.errors` → `.issues` に変更。`parsed.error.issues[0].message` を使う。

### `Property 'not' does not exist on type 'SQL<unknown>'`
Drizzle ORM では `.not()` チェーンは使えない。`isNotNull()` をインポートして使用。

### `Google Fonts fetch failed at build time`
ネットワーク制限環境では `next/font/google` がビルド時に失敗する。`layout.tsx` で `<link>` タグを使って読み込む。

### `params.id` で型エラー
Next.js 16 のルートパラメータは `Promise` 型。`const { id } = await params;` で展開する。

### `Module not found: '@date-fns/tz'`
`npm install @date-fns/tz` が必要。`date-fns` や `date-fns-tz` とは別パッケージ。

## スキーマ変更時の手順

1. `src/lib/schema.ts` の Drizzle スキーマを更新
2. `src/lib/db.ts` の `initializeDatabase()` 内 SQL を合わせて更新
3. 影響するAPI・コンポーネントの型を修正
4. `npm run build` で型チェック通過を確認

## デプロイ

### Vercel

1. GitHub リポジトリを Vercel に接続
2. 環境変数を Vercel Dashboard で設定
3. 自動デプロイ

### リマインド (Cloudflare Workers Cron)

`cron-worker/` の Cloudflare Worker が **5分間隔** で `GET /api/cron/remind` を叩く。
GitHub Actions の `schedule`（遅延が大きく時刻精度に難あり）から移行したもの。

セットアップ・デプロイ手順は [`cron-worker/README.md`](../cron-worker/README.md) を参照。

要点:
- `cron-worker/wrangler.toml` の `APP_URL` をデプロイ先URLに設定
- `npx wrangler secret put CRON_SECRET` でアプリと同じ値を登録
- `npm run deploy` でデプロイ（無料プランで動作。5分間隔=288回/日）
