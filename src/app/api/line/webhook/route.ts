import { NextResponse } from "next/server";
import { verifySignature, replyMessage } from "@/lib/line";
import { db, initializeDatabase } from "@/lib/db";
import { users, medications, medicationLogs } from "@/lib/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { todayJST } from "@/lib/utils";
import { computeOccurrences, recordDose } from "@/lib/occurrences";

// In-memory store for LINE link codes (code -> { userId, expiresAt })
const linkCodes = new Map<string, { userId: string; expiresAt: number }>();

export function storeLinkCode(code: string, userId: string) {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  linkCodes.set(code, { userId, expiresAt });
}

export function getLinkCodes() {
  return linkCodes;
}

const TAKEN_KEYWORDS = ["飲んだ", "のんだ", "ok", "OK", "完了", "飲みました", "のみました"];

export async function POST(request: Request) {
  try {
    await initializeDatabase();

    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    if (!signature || !verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const parsed = JSON.parse(body);
    const events = parsed.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const lineUserId = event.source.userId;
      const text = event.message.text.trim();
      const replyToken = event.replyToken;

      // Check if this is a link code
      if (/^\d{6}$/.test(text)) {
        await handleLinkCode(text, lineUserId, replyToken);
        continue;
      }

      // Check if user is linked
      const user = await db
        .select()
        .from(users)
        .where(eq(users.lineUserId, lineUserId))
        .get();

      if (!user) {
        await replyMessage(
          replyToken,
          "LINE連携がまだ完了していません。アプリの設定画面から連携コードを取得してください。"
        );
        continue;
      }

      // Check for taken keywords
      const isTakenMessage = TAKEN_KEYWORDS.some((kw) =>
        text.includes(kw)
      );

      if (isTakenMessage) {
        await handleTakenMessage(user.id, text, replyToken);
      } else {
        await replyMessage(
          replyToken,
          '服薬を記録するには「飲んだ」と送信してください。特定の薬だけ記録する場合は「（薬の名前）飲んだ」と送信してください。'
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("LINE webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}

async function handleLinkCode(
  code: string,
  lineUserId: string,
  replyToken: string
) {
  // Clean expired codes
  const now = Date.now();
  for (const [key, value] of linkCodes.entries()) {
    if (value.expiresAt < now) linkCodes.delete(key);
  }

  const linkData = linkCodes.get(code);
  if (!linkData) {
    await replyMessage(
      replyToken,
      "連携コードが無効または期限切れです。アプリから新しいコードを取得してください。"
    );
    return;
  }

  await db
    .update(users)
    .set({ lineUserId })
    .where(eq(users.id, linkData.userId));

  linkCodes.delete(code);

  await replyMessage(
    replyToken,
    "LINE連携が完了しました！服薬リマインドが届くようになります。"
  );
}

async function handleTakenMessage(
  userId: string,
  text: string,
  replyToken: string
) {
  const today = todayJST();
  const startOfDay = today + "T00:00:00";
  const endOfDay = today + "T23:59:59";

  // Get user's active medications
  const userMeds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), eq(medications.isActive, 1)))
    .all();

  // Check if a specific medication name is mentioned
  const specificMed = userMeds.find((med) => text.includes(med.name));
  const targetMeds = specificMed ? [specificMed] : userMeds;

  // 今日の服薬予定をスケジュールから算出する（予定は行を持たない）。
  const slots = computeOccurrences(targetMeds, [today]);
  if (slots.length === 0) {
    await replyMessage(
      replyToken,
      specificMed
        ? "該当する服薬予定が見つかりませんでした。"
        : "今日の服薬予定はありません。"
    );
    return;
  }

  // すでに taken/skipped 記録済みの枠を除外する。
  const stored = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.userId, userId),
        gte(medicationLogs.scheduledAt, startOfDay),
        lte(medicationLogs.scheduledAt, endOfDay)
      )
    )
    .all();
  const doneKeys = new Set(
    stored
      .filter((l) => l.status === "taken" || l.status === "skipped")
      .map((l) => `${l.medicationId}|${l.scheduledAt}`)
  );

  const slotsToRecord = slots.filter(
    (s) => !doneKeys.has(`${s.medicationId}|${s.scheduledAt}`)
  );

  if (slotsToRecord.length === 0) {
    await replyMessage(replyToken, "今日の服薬予定はすべて記録済みです。");
    return;
  }

  const now = new Date().toISOString();
  for (const slot of slotsToRecord) {
    await recordDose({
      userId,
      medicationId: slot.medicationId,
      scheduledAt: slot.scheduledAt,
      status: "taken",
      takenAt: now,
      source: "line",
    });
  }

  const medNames: string[] = [];
  for (const slot of slotsToRecord) {
    const med = userMeds.find((m) => m.id === slot.medicationId);
    if (med && !medNames.includes(med.name)) medNames.push(med.name);
  }

  await replyMessage(
    replyToken,
    `記録しました！お疲れさまです\n${medNames.join("、")}`
  );
}
