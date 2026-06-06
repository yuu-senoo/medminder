import { NextResponse } from "next/server";
import { z } from "zod";
import { db, initializeDatabase } from "@/lib/db";
import { medications, medicationLogs } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { buildLogView, recordDose } from "@/lib/occurrences";

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

    // 期間指定がある場合は、薬のスケジュールから服薬予定を算出し、
    // 保存済みの服薬イベント（taken/skipped）を重ね合わせて返す。
    // 予定は行として持たず、ここで計算するのが本設計の要。
    if (startDate && endDate) {
      let view = await buildLogView(targetUserId, startDate, endDate);
      if (medicationId) {
        view = view.filter((v) => v.medicationId === medicationId);
      }
      return NextResponse.json(view);
    }

    // 期間指定が無い場合は保存済みイベントのみを返す（予定の計算は行わない）。
    const conditions = [eq(medicationLogs.userId, targetUserId)];
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

    // 対象の薬がログイン中ユーザーのものか確認する。
    const med = await db
      .select()
      .from(medications)
      .where(
        and(eq(medications.id, data.medicationId), eq(medications.userId, userId))
      )
      .get();
    if (!med) {
      return NextResponse.json(
        { error: "薬が見つかりません" },
        { status: 404 }
      );
    }

    // 自然キー（userId + medicationId + scheduledAt）で upsert する。
    const saved = await recordDose({
      userId,
      medicationId: data.medicationId,
      scheduledAt: data.scheduledAt,
      status: data.status,
      takenAt: data.takenAt ?? null,
      source: data.source,
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Log create error:", error);
    return NextResponse.json(
      { error: "ログの作成に失敗しました" },
      { status: 500 }
    );
  }
}
