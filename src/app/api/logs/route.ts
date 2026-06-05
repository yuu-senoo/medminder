import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db, initializeDatabase } from "@/lib/db";
import { medicationLogs } from "@/lib/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { ensureLogsForRange } from "@/lib/schedule";

const logSchema = z.object({
  medicationId: z.string(),
  scheduledAt: z.string(),
  status: z.enum(["pending", "taken", "skipped", "missed"]),
  source: z.enum(["web", "line"]).default("web"),
  takenAt: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    await initializeDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId") || userId;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const medicationId = url.searchParams.get("medicationId");

    // 期間指定がある場合は、未生成の服薬予定（pending ログ）を補完してから取得する。
    // お薬登録時には予定が作られないため、ここで穴埋めしないと
    // ダッシュボード・カレンダーに何も表示されない。
    if (startDate && endDate) {
      await ensureLogsForRange(targetUserId, startDate, endDate);
    }

    const conditions = [eq(medicationLogs.userId, targetUserId)];

    if (startDate) {
      conditions.push(gte(medicationLogs.scheduledAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(medicationLogs.scheduledAt, endDate + "T23:59:59"));
    }
    if (medicationId) {
      conditions.push(eq(medicationLogs.medicationId, medicationId));
    }

    const result = await db
      .select()
      .from(medicationLogs)
      .where(and(...conditions))
      .all();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Logs fetch error:", error);
    return NextResponse.json(
      { error: "ログの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = logSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const id = uuidv4();

    await db.insert(medicationLogs).values({
      id,
      medicationId: data.medicationId,
      userId,
      scheduledAt: data.scheduledAt,
      takenAt: data.takenAt ?? null,
      status: data.status,
      source: data.source,
      createdAt: Math.floor(Date.now() / 1000),
    });

    const created = await db
      .select()
      .from(medicationLogs)
      .where(eq(medicationLogs.id, id))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Log create error:", error);
    return NextResponse.json(
      { error: "ログの作成に失敗しました" },
      { status: 500 }
    );
  }
}
