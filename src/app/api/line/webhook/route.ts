import { NextResponse } from "next/server";
import { verifySignature, replyMessage } from "@/lib/line";
import { db, initializeDatabase } from "@/lib/db";
import { users, medications, medicationLogs, lineLinkCodes } from "@/lib/schema";
import { eq, and, lt } from "drizzle-orm";
import { todayJST } from "@/lib/utils";

const LINK_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Persist link codes in the DB so the code-generation route and this webhook
// (which run as separate serverless instances) can share them.
export async function storeLinkCode(code: string, userId: string) {
  const now = Date.now();
  // Replace any existing codes for this user with the new one.
  await db.delete(lineLinkCodes).where(eq(lineLinkCodes.userId, userId));
  await db.insert(lineLinkCodes).values({
    code,
    userId,
    expiresAt: now + LINK_CODE_TTL_MS,
    createdAt: now,
  });
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
  await db.delete(lineLinkCodes).where(lt(lineLinkCodes.expiresAt, now));

  const linkData = await db
    .select()
    .from(lineLinkCodes)
    .where(eq(lineLinkCodes.code, code))
    .get();

  if (!linkData || linkData.expiresAt < now) {
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

  await db.delete(lineLinkCodes).where(eq(lineLinkCodes.code, code));

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

  // Get pending logs for today
  const pendingLogs = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.userId, userId),
        eq(medicationLogs.status, "pending")
      )
    )
    .all();

  const todayPendingLogs = pendingLogs.filter(
    (log) => log.scheduledAt >= startOfDay && log.scheduledAt <= endOfDay
  );

  if (todayPendingLogs.length === 0) {
    await replyMessage(replyToken, "今日の服薬予定はすべて記録済みです。");
    return;
  }

  const logsToUpdate = specificMed
    ? todayPendingLogs.filter((log) => log.medicationId === specificMed.id)
    : todayPendingLogs;

  if (logsToUpdate.length === 0) {
    await replyMessage(replyToken, "該当する服薬予定が見つかりませんでした。");
    return;
  }

  const now = new Date().toISOString();
  for (const log of logsToUpdate) {
    await db
      .update(medicationLogs)
      .set({ status: "taken", takenAt: now, source: "line" })
      .where(eq(medicationLogs.id, log.id));
  }

  const medNames: string[] = [];
  for (const log of logsToUpdate) {
    const med = userMeds.find((m) => m.id === log.medicationId);
    if (med && !medNames.includes(med.name)) medNames.push(med.name);
  }

  await replyMessage(
    replyToken,
    `記録しました！お疲れさまです\n${medNames.join("、")}`
  );
}
