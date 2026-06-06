# データベース設計

## 概要

- **DB**: Turso (libSQL / SQLite互換)
- **ORM**: Drizzle ORM
- **スキーマ定義**: `src/lib/schema.ts`
- **DB接続**: `src/lib/db.ts`
- **テーブル自動作成**: `initializeDatabase()` で CREATE TABLE IF NOT EXISTS を実行

ローカル開発時は `TURSO_DATABASE_URL` 未設定で `file:local.db`（ローカルSQLiteファイル）にフォールバック。

## ER図

```
users
  │
  ├──< medications
  │       │
  │       └──< medication_logs
  │
  ├──< family_members (owner_user_id)
  ├──< family_members (member_user_id)
  │
  ├──< family_invites (owner_user_id)
  └──< family_invites (used_by_user_id)
```

## テーブル定義

### users

| カラム | DB名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| id | id | TEXT | PK | UUID |
| email | email | TEXT | NOT NULL, UNIQUE | ログイン用メールアドレス |
| name | name | TEXT | NOT NULL | 表示名 |
| passwordHash | password_hash | TEXT | NOT NULL | bcryptハッシュ |
| lineUserId | line_user_id | TEXT | nullable | LINE連携時に格納 |
| createdAt | created_at | INTEGER | NOT NULL | UNIXタイムスタンプ |

### medications

| カラム | DB名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| id | id | TEXT | PK | UUID |
| userId | user_id | TEXT | NOT NULL, FK→users.id | 所有ユーザー |
| name | name | TEXT | NOT NULL | 薬の名前 |
| dosage | dosage | TEXT | NOT NULL | 用量（例: "1錠"） |
| scheduleType | schedule_type | TEXT | NOT NULL | `"daily"` / `"specific_days"` / `"interval"` |
| scheduleTimes | schedule_times | TEXT | NOT NULL | JSON文字列 `["08:00","20:00"]` |
| scheduleDays | schedule_days | TEXT | nullable | JSON文字列 `["mon","wed","fri"]` |
| scheduleInterval | schedule_interval | INTEGER | nullable | n日おきのn |
| startDate | start_date | TEXT | NOT NULL | 開始日 `YYYY-MM-DD` |
| endDate | end_date | TEXT | nullable | 終了日 `YYYY-MM-DD` |
| note | note | TEXT | nullable | メモ |
| isActive | is_active | INTEGER | NOT NULL, DEFAULT 1 | 有効フラグ (0/1) |
| createdAt | created_at | INTEGER | NOT NULL | UNIXタイムスタンプ |

**scheduleType の値と関連カラム:**

| scheduleType | scheduleTimes | scheduleDays | scheduleInterval |
|---|---|---|---|
| `daily` | 必須 | 未使用 | 未使用 |
| `specific_days` | 必須 | 必須 `["mon","tue",...]` | 未使用 |
| `interval` | 必須 | 未使用 | 必須 (例: 2 = 2日おき) |

**曜日の値**: `"sun"`, `"mon"`, `"tue"`, `"wed"`, `"thu"`, `"fri"`, `"sat"`

### medication_logs

**実際に記録された服薬イベント（taken / skipped）だけ**を保存するテーブル。
服薬予定（pending）や飲み忘れ（missed）は行として持たず、取得時に
`medications` のスケジュール定義から算出する（[architecture.md](architecture.md)
の「服薬予定の算出（仮想オカレンス）」を参照）。

| カラム | DB名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| id | id | TEXT | PK | UUID |
| medicationId | medication_id | TEXT | NOT NULL, FK→medications.id | 対象の薬 |
| userId | user_id | TEXT | NOT NULL, FK→users.id | 対象ユーザー |
| scheduledAt | scheduled_at | TEXT | NOT NULL | 予定日時 (ISO 8601) |
| takenAt | taken_at | TEXT | nullable | 服薬日時 (ISO 8601) |
| status | status | TEXT | NOT NULL | 通常は `"taken"` / `"skipped"`（記録済みイベント） |
| source | source | TEXT | NOT NULL | `"web"` / `"line"` |
| createdAt | created_at | INTEGER | NOT NULL | UNIXタイムスタンプ |

**自然キー:** `(user_id, medication_id, scheduled_at)` の組で 1 枠を一意に識別する。
服薬記録は `POST /api/logs` でこのキーを使って upsert される。

**status について:**

- `"taken"` … 服薬を記録した枠
- `"skipped"` … スキップした枠
- `"pending"` / `"missed"` … 行としては保存せず、取得時に算出（過去で未記録なら
  `missed`、当日・未来で未記録なら `pending`）。
  旧実装が作成した `"pending"` 行が残っていても、取得時は「未記録」として無視される。

### family_members

| カラム | DB名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| id | id | TEXT | PK | UUID |
| ownerUserId | owner_user_id | TEXT | NOT NULL, FK→users.id | 招待した側 |
| memberUserId | member_user_id | TEXT | NOT NULL, FK→users.id | 招待された側 |
| role | role | TEXT | NOT NULL | `"viewer"` / `"admin"` |
| createdAt | created_at | INTEGER | NOT NULL | UNIXタイムスタンプ |

### family_invites

| カラム | DB名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| id | id | TEXT | PK | UUID |
| ownerUserId | owner_user_id | TEXT | NOT NULL, FK→users.id | 発行者 |
| inviteCode | invite_code | TEXT | NOT NULL, UNIQUE | 6桁の招待コード |
| role | role | TEXT | NOT NULL | `"viewer"` / `"admin"` |
| expiresAt | expires_at | INTEGER | NOT NULL | 有効期限 (UNIXタイムスタンプ, 24時間) |
| usedByUserId | used_by_user_id | TEXT | nullable | 使用者のユーザーID |
| createdAt | created_at | INTEGER | NOT NULL | UNIXタイムスタンプ |

## Drizzle ORM の命名規約

- **スキーマ (TypeScript)**: camelCase（例: `userId`, `scheduleTimes`）
- **DBカラム名**: snake_case（例: `user_id`, `schedule_times`）
- Drizzleが自動でマッピング（スキーマ定義時に `text("snake_case")` で指定）

## テーブル初期化

`initializeDatabase()` (`src/lib/db.ts`) が全APIルートの先頭で呼ばれ、
テーブルが存在しない場合のみ作成される（`CREATE TABLE IF NOT EXISTS`）。

Drizzle Kit のマイグレーション機能は現在未使用。スキーマ変更時は `initializeDatabase()` 内のSQL文も合わせて更新すること。

## JSON カラムの扱い

`scheduleTimes` と `scheduleDays` はTEXT型にJSON文字列として格納。読み出し時に `JSON.parse()` する。

```typescript
// 書き込み
scheduleTimes: JSON.stringify(["08:00", "20:00"])

// 読み出し
const times: string[] = JSON.parse(medication.scheduleTimes);
```
