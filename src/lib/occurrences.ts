import { v4 as uuidv4 } from "uuid";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { medications, medicationLogs } from "@/lib/schema";
import { shouldTakeMedicationOnDate, todayJST } from "@/lib/utils";

// 一度に算出する期間の安全上限（日数）
const MAX_RANGE_DAYS = 370;

type MedicationRow = typeof medications.$inferSelect;
type MedicationLogRow = typeof medicationLogs.$inferSelect;

// GET /api/logs が返す服薬予定/実績のビュー。
// 保存済みイベントは実 id を、未記録の予定は合成 id（"v:..."）を持つ。
export interface LogView {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: "pending" | "taken" | "skipped" | "missed";
  takenAt: string | null;
  source: string | null;
}

// 服薬予定の 1 枠（どの薬を・いつ飲むか）。
export interface Occurrence {
  medicationId: string;
  scheduledAt: string;
}

// "YYYY-MM-DD" 〜 "YYYY-MM-DD"（両端含む）の日付文字列配列。
// カレンダー上の日付計算のみ行うため UTC 基準で 1 日ずつ進める。
function eachDateInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00Z").getTime();
  const end = new Date(endDate + "T00:00:00Z").getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return dates;

  for (let t = start; t <= end; t += 86_400_000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
    if (dates.length >= MAX_RANGE_DAYS) break;
  }
  return dates;
}

const occurrenceKey = (medicationId: string, scheduledAt: string) =>
  `${medicationId}|${scheduledAt}`;

/**
 * 薬のスケジュール定義から、指定日の服薬予定枠を算出する（純粋関数）。
 * 行は作らず、その場で計算するのが本設計の要。
 */
export function computeOccurrences(
  meds: MedicationRow[],
  dates: string[]
): Occurrence[] {
  const slots: Occurrence[] = [];
  for (const med of meds) {
    const times: string[] = JSON.parse(med.scheduleTimes);
    for (const date of dates) {
      if (!shouldTakeMedicationOnDate(med, date)) continue;
      for (const time of times) {
        slots.push({ medicationId: med.id, scheduledAt: `${date}T${time}:00` });
      }
    }
  }
  return slots;
}

function toView(row: MedicationLogRow): LogView {
  return {
    id: row.id,
    medicationId: row.medicationId,
    scheduledAt: row.scheduledAt,
    status: row.status as LogView["status"],
    takenAt: row.takenAt,
    source: row.source,
  };
}

/**
 * 指定ユーザーの指定期間について、服薬予定（計算）に保存済みイベント（記録）を
 * 重ね合わせたビューを返す。
 *
 * - 予定枠に対応する taken/skipped 記録があればそれを採用
 * - 記録が無い枠は、過去日なら "missed"、当日・未来なら "pending" として導出
 * - スケジュール変更で予定枠から外れた過去の記録も履歴として残す
 *
 * 保存行のうち status="pending" のものは「未記録」とみなして無視する
 * （旧実装が作成した pending 行に引きずられず、現在のスケジュールを反映するため）。
 */
export async function buildLogView(
  userId: string,
  startDate: string,
  endDate: string
): Promise<LogView[]> {
  const dates = eachDateInRange(startDate, endDate);
  if (dates.length === 0) return [];

  const activeMeds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), eq(medications.isActive, 1)))
    .all();

  const stored = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.userId, userId),
        gte(medicationLogs.scheduledAt, startDate),
        lte(medicationLogs.scheduledAt, endDate + "T23:59:59")
      )
    )
    .all();

  // 実際に記録されたイベント（pending は未記録扱いで除外）。
  const events = stored.filter((l) => l.status !== "pending");
  const eventByKey = new Map(
    events.map((e) => [occurrenceKey(e.medicationId, e.scheduledAt), e])
  );

  const today = todayJST();
  const result: LogView[] = [];
  const seen = new Set<string>();

  for (const slot of computeOccurrences(activeMeds, dates)) {
    const key = occurrenceKey(slot.medicationId, slot.scheduledAt);
    seen.add(key);
    const event = eventByKey.get(key);
    if (event) {
      result.push(toView(event));
    } else {
      const isPast = slot.scheduledAt.slice(0, 10) < today;
      result.push({
        id: `v:${key}`,
        medicationId: slot.medicationId,
        scheduledAt: slot.scheduledAt,
        status: isPast ? "missed" : "pending",
        takenAt: null,
        source: null,
      });
    }
  }

  // 現在のスケジュールに合致しない過去の記録も履歴として残す。
  for (const event of events) {
    const key = occurrenceKey(event.medicationId, event.scheduledAt);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(toView(event));
  }

  result.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return result;
}

/**
 * 服薬イベントを自然キー（userId + medicationId + scheduledAt）で upsert する。
 * 予定枠は行を持たないため、記録時に初めて行を作成（または更新）する。
 */
export async function recordDose(params: {
  userId: string;
  medicationId: string;
  scheduledAt: string;
  status: "taken" | "skipped" | "pending" | "missed";
  takenAt?: string | null;
  source?: string;
}): Promise<LogView> {
  const { userId, medicationId, scheduledAt, status } = params;
  const source = params.source ?? "web";
  const takenAt =
    params.takenAt ?? (status === "taken" ? new Date().toISOString() : null);

  const existing = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.userId, userId),
        eq(medicationLogs.medicationId, medicationId),
        eq(medicationLogs.scheduledAt, scheduledAt)
      )
    )
    .get();

  if (existing) {
    await db
      .update(medicationLogs)
      .set({ status, takenAt, source })
      .where(eq(medicationLogs.id, existing.id));
    return { ...toView(existing), status, takenAt, source };
  }

  const id = uuidv4();
  await db.insert(medicationLogs).values({
    id,
    medicationId,
    userId,
    scheduledAt,
    takenAt,
    status,
    source,
    createdAt: Math.floor(Date.now() / 1000),
  });

  return { id, medicationId, scheduledAt, status, takenAt, source };
}
