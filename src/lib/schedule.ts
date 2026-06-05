import { v4 as uuidv4 } from "uuid";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { medications, medicationLogs } from "@/lib/schema";
import { shouldTakeMedicationOnDate } from "@/lib/utils";

// 範囲補完で一度に生成しすぎないための安全上限（日数）
const MAX_RANGE_DAYS = 370;

// "YYYY-MM-DD" 〜 "YYYY-MM-DD"（両端含む）の日付文字列配列を返す。
// カレンダー上の日付計算のみを行うため UTC 基準で 1 日ずつ進める。
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

/**
 * 指定ユーザーの指定期間について、服薬予定（pending ログ）が未生成の枠を
 * medication_logs に補完保存する。お薬登録時には予定が作られないため、
 * ダッシュボード・カレンダーの表示取得時にこの関数で穴埋めする。
 *
 * すでに存在する枠（medicationId + scheduledAt が一致）は再生成しない。
 */
export async function ensureLogsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const dates = eachDateInRange(startDate, endDate);
  if (dates.length === 0) return;

  const activeMeds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), eq(medications.isActive, 1)))
    .all();
  if (activeMeds.length === 0) return;

  // 期間内の既存ログを取得し、重複生成を避けるためのキー集合を作る。
  const existing = await db
    .select({
      medicationId: medicationLogs.medicationId,
      scheduledAt: medicationLogs.scheduledAt,
    })
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.userId, userId),
        gte(medicationLogs.scheduledAt, startDate),
        lte(medicationLogs.scheduledAt, endDate + "T23:59:59")
      )
    )
    .all();

  const existingKeys = new Set(
    existing.map((e) => `${e.medicationId}|${e.scheduledAt}`)
  );

  const createdAt = Math.floor(Date.now() / 1000);
  const toInsert: (typeof medicationLogs.$inferInsert)[] = [];

  for (const med of activeMeds) {
    const times: string[] = JSON.parse(med.scheduleTimes);
    for (const date of dates) {
      if (!shouldTakeMedicationOnDate(med, date)) continue;
      for (const time of times) {
        const scheduledAt = `${date}T${time}:00`;
        const key = `${med.id}|${scheduledAt}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        toInsert.push({
          id: uuidv4(),
          medicationId: med.id,
          userId,
          scheduledAt,
          takenAt: null,
          status: "pending",
          source: "web",
          createdAt,
        });
      }
    }
  }

  if (toInsert.length > 0) {
    await db.insert(medicationLogs).values(toInsert);
  }
}
