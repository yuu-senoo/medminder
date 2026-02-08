import { NextResponse } from "next/server";
import { z } from "zod";
import { db, initializeDatabase } from "@/lib/db";
import { medicationLogs } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";

const updateLogSchema = z.object({
  status: z.enum(["pending", "taken", "skipped", "missed"]),
  takenAt: z.string().nullable().optional(),
  source: z.enum(["web", "line"]).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(medicationLogs)
      .where(and(eq(medicationLogs.id, id), eq(medicationLogs.userId, userId)))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "ログが見つかりません" },
        { status: 404 }
      );
    }

    const data = parsed.data;

    await db
      .update(medicationLogs)
      .set({
        status: data.status,
        takenAt: data.takenAt ?? (data.status === "taken" ? new Date().toISOString() : null),
        source: data.source ?? existing.source,
      })
      .where(and(eq(medicationLogs.id, id), eq(medicationLogs.userId, userId)));

    const updated = await db
      .select()
      .from(medicationLogs)
      .where(eq(medicationLogs.id, id))
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Log update error:", error);
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }
}
