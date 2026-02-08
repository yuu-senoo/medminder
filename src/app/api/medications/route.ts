import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db, initializeDatabase } from "@/lib/db";
import { medications } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";

const medicationSchema = z.object({
  name: z.string().min(1, "薬の名前を入力してください"),
  dosage: z.string().min(1, "用量を入力してください"),
  scheduleType: z.enum(["daily", "specific_days", "interval"]),
  scheduleTimes: z.array(z.string()).min(1, "時刻を1つ以上設定してください"),
  scheduleDays: z.array(z.string()).nullable().optional(),
  scheduleInterval: z.number().nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
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

    const result = await db
      .select()
      .from(medications)
      .where(eq(medications.userId, targetUserId))
      .all();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Medications fetch error:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
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
    const parsed = medicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const id = uuidv4();

    await db.insert(medications).values({
      id,
      userId,
      name: data.name,
      dosage: data.dosage,
      scheduleType: data.scheduleType,
      scheduleTimes: JSON.stringify(data.scheduleTimes),
      scheduleDays: data.scheduleDays ? JSON.stringify(data.scheduleDays) : null,
      scheduleInterval: data.scheduleInterval ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      note: data.note ?? null,
      isActive: 1,
      createdAt: Math.floor(Date.now() / 1000),
    });

    const created = await db
      .select()
      .from(medications)
      .where(and(eq(medications.id, id), eq(medications.userId, userId)))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Medication create error:", error);
    return NextResponse.json(
      { error: "薬の登録に失敗しました" },
      { status: 500 }
    );
  }
}
