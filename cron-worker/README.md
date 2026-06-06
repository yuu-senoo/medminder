# 服薬リマインド Cron Worker (Cloudflare Workers)

服薬リマインドを **5分間隔** で実行するための Cloudflare Worker。
Cron Trigger で発火し、アプリの `GET /api/cron/remind` を Bearer 認証付きで叩くだけの軽量Worker。

GitHub Actions の `schedule`（最短5分・遅延が大きい）を置き換えるもの。
実際のリマインド判定・LINE送信ロジックはすべてアプリ側にあるため、本Workerは「定期的にURLを叩く」役割だけを持つ。

## 無料枠について

Cloudflare Workers の無料プランで十分動作する:

- Cron Trigger: 5個まで（本Workerは1個）
- リクエスト: 10万/日まで（5分間隔 = 288回/日）
- CPU時間: 10ms/呼び出し（`fetch` の待機時間はCPU時間に含まれないため問題なし）

## セットアップ

### 1. 依存インストール

```bash
cd cron-worker
npm install
```

### 2. Cloudflare にログイン

```bash
npx wrangler login
```

### 3. アプリURLを設定

`wrangler.toml` の `[vars] APP_URL` を本番アプリのURLに書き換える:

```toml
[vars]
APP_URL = "https://kusuri-log.example.com"
```

### 4. CRON_SECRET をシークレット登録

アプリ側の環境変数 `CRON_SECRET` と**同じ値**を登録する:

```bash
npx wrangler secret put CRON_SECRET
# プロンプトに値を貼り付け
```

### 5. デプロイ

```bash
npm run deploy
```

デプロイ後、Cloudflare ダッシュボードの Workers & Pages > 該当Worker > Settings > Triggers で
Cron `*/5 * * * *` が登録されていることを確認できる。

## 動作確認・ログ

```bash
# リアルタイムログを表示
npm run tail

# ローカルで scheduled ハンドラを手動発火してテスト
npm run dev
# 別ターミナルで:  curl "http://localhost:8787/__scheduled"
```

成功時は `Remind ok: 200 {...}`、失敗時は `Remind failed: ...` がログに出る。

## スケジュール変更

`wrangler.toml` の `crons` を編集して再デプロイ:

```toml
[triggers]
crons = ["*/5 * * * *"]   # 5分ごと
# crons = ["* * * * *"]   # 1分ごと（※アプリ側の5分窓を1分窓に狭める修正が別途必要）
```
