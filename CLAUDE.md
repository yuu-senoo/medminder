# CLAUDE.md - くすりログ (Kusuri Log)

服薬管理・リマインドWebアプリ。Next.js 16 (App Router) + TypeScript + Turso/Drizzle ORM + NextAuth v4 + LINE Bot SDK + Tailwind CSS v4。

## クイックリファレンス

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLint 実行
```

## プロジェクト構成

```
src/
├── app/           # Next.js App Router (ページ + API)
├── components/    # Reactコンポーネント
├── lib/           # DB・認証・LINE・ユーティリティ
└── types/         # TypeScript型定義
```

詳細は [docs/architecture.md](docs/architecture.md) を参照。

## 技術スタック・バージョン注意点

| 技術 | バージョン | 注意点 |
|---|---|---|
| Next.js | 16 | ルートパラメータは `Promise<{id: string}>` — `await params` が必要 |
| Zod | v4 | `parsed.error.issues[0].message`（v3の `.errors` ではない） |
| Tailwind CSS | v4 | `tailwind.config.ts` 不要。`globals.css` の `@theme inline {}` で設定 |
| Drizzle ORM | 0.45 | `.not()` チェーン不可。`isNotNull()` を `drizzle-orm` からimport |
| Google Fonts | - | ビルド時fetchが失敗する環境では `<link>` タグを使用（`next/font/google` ではなく） |
| @date-fns/tz | 別途install必要 | `TZDate` クラスで Asia/Tokyo タイムゾーン処理 |

## コーディングパターン

### API ルートの基本構造

```typescript
export async function POST(request: Request) {
  try {
    await initializeDatabase();                         // 1. DB初期化
    const userId = await getCurrentUserId();             // 2. 認証チェック
    if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);               // 3. Zodバリデーション
    if (!parsed.success) return NextResponse.json(
      { error: parsed.error.issues[0].message }, { status: 400 }
    );

    // 4. DB操作 → レスポンス
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "日本語エラー" }, { status: 500 });
  }
}
```

### 動的ルートのパラメータ（Next.js 16）

```typescript
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // 必ず await する
}
```

## 環境変数

`.env.example` 参照。ローカル開発は `cp .env.example .env.local` で作成。
DB未設定時は `file:local.db`（ローカルSQLite）にフォールバック。

## ドキュメント

- [docs/architecture.md](docs/architecture.md) — システム構成・ファイル構成・データフロー
- [docs/database.md](docs/database.md) — テーブル定義・リレーション・マイグレーション
- [docs/api.md](docs/api.md) — 全APIエンドポイントのリクエスト/レスポンス仕様
- [docs/development.md](docs/development.md) — 開発環境セットアップ・規約・トラブルシューティング
