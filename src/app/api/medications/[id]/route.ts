import { NextResponse } from "next/server";
import { z } from "zod";
import { db, initializeDatabase } from "@/lib/db";
import { medications } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  scheduleType: z.enum(["daily", "specific_days", "interval"]).optional(),
  scheduleTimes: z.array(z.string()).optional(),
  scheduleDays: z.array(z.string()).nullable().optional(),
  scheduleInterval: z.number().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  isActive: z.number().min(0).max(1).optional(),
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
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(medications)
      .where(and(eq(medications.id, id), eq(medications.userId, userId)))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "薬が見つかりません" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType;
    if (data.scheduleTimes !== undefined) updateData.scheduleTimes = JSON.stringify(data.scheduleTimes);
    if (data.scheduleDays !== undefined) updateData.scheduleDays = data.scheduleDays ? JSON.stringify(data.scheduleDays) : null;
    if (data.scheduleInterval !== undefined) updateData.scheduleInterval = data.scheduleInterval;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db
      .update(medications)
      .set(updateData)
      .where(and(eq(medications.id, id), eq(medications.userId, userId)));

    const updated = await db
      .select()
      .from(medications)
      .where(eq(medications.id, id))
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Medication update error:", error);
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db
      .select()
      .from(medications)
      .where(and(eq(medications.id, id), eq(medications.userId, userId)))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "薬が見つかりません" },
        { status: 404 }
      );
    }

    await db
      .delete(medications)
      .where(and(eq(medications.id, id), eq(medications.userId, userId)));

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Medication delete error:", error);
    return NextResponse.json(
      { error: "削除に失敗しました" },
      { status: 500 }
    );
  }
}
