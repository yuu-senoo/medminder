# API リファレンス

全エンドポイントのリクエスト/レスポンス仕様。認証が必要なAPIは `getCurrentUserId()` で JWT セッションをチェックする。

## 認証

### POST `/api/auth/register`

ユーザー新規登録。

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "12345678",
  "name": "太郎"
}
```

**バリデーション:**
- email: 有効なメールアドレス
- password: 8文字以上
- name: 1文字以上

**レスポンス:**
- `201`: `{ "message": "登録が完了しました" }`
- `400`: バリデーションエラー
- `409`: `{ "error": "このメールアドレスは既に登録されています" }`

### POST `/api/auth/[...nextauth]`

NextAuth ハンドラ。`signIn("credentials", { email, password })` でクライアントから呼び出す。

---

## 薬管理

全て認証必須。

### GET `/api/medications`

薬一覧を取得。

**クエリパラメータ:**
| パラメータ | 説明 |
|---|---|
| `userId` | 対象ユーザーID（省略時は自分） |

**レスポンス:** `200`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "ロキソニン",
    "dosage": "1錠",
    "scheduleType": "daily",
    "scheduleTimes": "[\"08:00\",\"20:00\"]",
    "scheduleDays": null,
    "scheduleInterval": null,
    "startDate": "2026-01-01",
    "endDate": null,
    "note": "食後に服用",
    "isActive": 1,
    "createdAt": 1700000000
  }
]
```

### POST `/api/medications`

薬を新規登録。

**リクエスト:**
```json
{
  "name": "ロキソニン",
  "dosage": "1錠",
  "scheduleType": "daily",
  "scheduleTimes": ["08:00", "20:00"],
  "scheduleDays": null,
  "scheduleInterval": null,
  "startDate": "2026-01-01",
  "endDate": null,
  "note": "食後に服用"
}
```

**レスポンス:**
- `201`: 作成された薬オブジェクト
- `400`: バリデーションエラー

### PUT `/api/medications/[id]`

薬を更新。送信したフィールドのみ更新される。

**リクエスト（部分更新可）:**
```json
{
  "name": "新しい名前",
  "isActive": 0
}
```

**レスポンス:**
- `200`: 更新後の薬オブジェクト
- `404`: `{ "error": "薬が見つかりません" }`

### DELETE `/api/medications/[id]`

薬を削除。

**レスポンス:**
- `200`: `{ "message": "削除しました" }`
- `404`: `{ "error": "薬が見つかりません" }`

---

## 服薬ログ

全て認証必須。

### GET `/api/logs`

服薬ログを取得。

**クエリパラメータ:**
| パラメータ | 説明 |
|---|---|
| `userId` | 対象ユーザーID（省略時は自分） |
| `startDate` | 開始日 `YYYY-MM-DD`（scheduledAt >= この日） |
| `endDate` | 終了日 `YYYY-MM-DD`（scheduledAt <= この日 23:59:59） |
| `medicationId` | 特定の薬でフィルタ |

**レスポンス:** `200`
```json
[
  {
    "id": "uuid",
    "medicationId": "uuid",
    "userId": "uuid",
    "scheduledAt": "2026-01-15T08:00:00",
    "takenAt": "2026-01-15T08:05:30.000Z",
    "status": "taken",
    "source": "web",
    "createdAt": 1700000000
  }
]
```

### POST `/api/logs`

服薬ログを手動作成。

**リクエスト:**
```json
{
  "medicationId": "uuid",
  "scheduledAt": "2026-01-15T08:00:00",
  "status": "pending",
  "source": "web",
  "takenAt": null
}
```

### PUT `/api/logs/[id]`

ログのステータスを更新（服薬記録・スキップ）。

**リクエスト:**
```json
{
  "status": "taken",
  "takenAt": "2026-01-15T08:05:30.000Z",
  "source": "web"
}
```

`takenAt` 省略時、status が `"taken"` なら現在時刻が自動セットされる。

---

## LINE連携

### POST `/api/line/link` (認証必須)

LINE連携用の6桁コードを発行。メモリに保存され10分で失効。

**レスポンス:** `200`
```json
{ "code": "123456" }
```

### POST `/api/line/webhook` (認証不要、署名検証あり)

LINE Messaging API の Webhook 受信エンドポイント。

**署名検証:** `x-line-signature` ヘッダーを `LINE_CHANNEL_SECRET` で検証。

**処理フロー:**
1. テキストが6桁数字 → LINE連携コード照合
2. 「飲んだ」等のキーワード → 今日の pending ログを taken に更新
3. 薬名 + キーワード → その薬のみ記録
4. その他 → 使い方案内を返信

**認識するキーワード:** `飲んだ`, `のんだ`, `ok`, `OK`, `完了`, `飲みました`, `のみました`

---

## リマインド

### GET `/api/cron/remind`

定期実行用。GitHub Actions から5分間隔で呼び出される。

**認証:** `Authorization: Bearer {CRON_SECRET}` ヘッダーが必要。

**処理:**
1. `lineUserId` が設定された全ユーザーを取得
2. 各ユーザーのアクティブな薬を取得
3. 現在時刻が `scheduleTimes` の5分ウィンドウ内か判定
4. 重複チェック後、`pending` ログを作成
5. LINE Push Message でリマインド送信

**レスポンス:** `200`
```json
{
  "status": "ok",
  "reminded": 3,
  "time": "08:00"
}
```

---

## 家族共有

全て認証必須。

### GET `/api/family`

家族メンバー一覧を取得。自分がオーナーまたはメンバーのレコードを返す。

**レスポンス:** `200`
```json
[
  {
    "id": "uuid",
    "ownerUserId": "uuid",
    "memberUserId": "uuid",
    "role": "viewer",
    "isOwner": true,
    "user": {
      "id": "uuid",
      "name": "花子",
      "email": "hanako@example.com"
    }
  }
]
```

### POST `/api/family`

招待コードを発行。

**リクエスト:**
```json
{ "role": "viewer" }
```

**レスポンス:** `201`
```json
{ "inviteCode": "654321" }
```

### POST `/api/family/invite`

招待コードで家族に参加。

**リクエスト:**
```json
{ "inviteCode": "654321" }
```

**レスポンス:**
- `200`: `{ "message": "家族メンバーとして登録されました" }`
- `400`: コード使用済み / 期限切れ / 自分のコード
- `404`: コードが見つからない

---

## 共通エラーレスポンス

全APIで統一されたエラー形式:

```json
{ "error": "日本語のエラーメッセージ" }
```

| ステータスコード | 用途 |
|---|---|
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 署名検証失敗（LINE Webhook） |
| 404 | リソースが見つからない |
| 409 | 重複（メールアドレス登録時） |
| 500 | サーバーエラー |
