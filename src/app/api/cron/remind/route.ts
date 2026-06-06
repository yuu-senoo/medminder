import { NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";
import { users, medications, medicationLogs } from "@/lib/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { pushMessage } from "@/lib/line";
import {
  todayJST,
  formatDateJST,
  nowJST,
  shouldTakeMedicationOnDate,
} from "@/lib/utils";

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initializeDatabase();

    const today = todayJST();
    const now = nowJST();
    const currentTime = formatDateJST(now, "HH:mm");

    // Get all users with LINE linked
    const linkedUsers = await db
      .select()
      .from(users)
      .where(isNotNull(users.lineUserId))
      .all();

    const filteredUsers = linkedUsers.filter((u) => u.lineUserId);

    let remindedCount = 0;

    for (const user of filteredUsers) {
      // Get active medications for this user
      const userMeds = await db
        .select()
        .from(medications)
        .where(
          and(eq(medications.userId, user.id), eq(medications.isActive, 1))
        )
        .all();

      const medsToRemind = [];

      for (const med of userMeds) {
        // Check if medication should be taken today
        if (!shouldTakeMedicationOnDate(med, today)) continue;

        // Check schedule times
        const times: string[] = JSON.parse(med.scheduleTimes);
        for (const time of times) {
          // Check if current time matches (within 5 minute window)
          const [schedH, schedM] = time.split(":").map(Number);
          const [currH, currM] = currentTime.split(":").map(Number);
          const schedMinutes = schedH * 60 + schedM;
          const currMinutes = currH * 60 + currM;

          if (currMinutes >= schedMinutes && currMinutes < schedMinutes + 5) {
            // 服薬予定は行を持たず計算で導出するため、cron はデータを作らず
            // 通知の送信のみを担う。taken/skipped が記録済みの枠はスキップし、
            // 未記録の枠だけリマインドする。
            const scheduledAt = `${today}T${time}:00`;
            const event = await db
              .select()
              .from(medicationLogs)
              .where(
                and(
                  eq(medicationLogs.medicationId, med.id),
                  eq(medicationLogs.scheduledAt, scheduledAt)
                )
              )
              .get();

            if (!event || (event.status !== "taken" && event.status !== "skipped")) {
              medsToRemind.push(med);
            }
          }
        }
      }

      if (medsToRemind.length > 0 && user.lineUserId) {
        const medList = medsToRemind
          .map((m) => `・${m.name} ${m.dosage}`)
          .join("\n");

        const message = `お薬の時間です\n${medList}\n\n飲んだら「飲んだ」と返信してください`;

        try {
          await pushMessage(user.lineUserId, message);
          remindedCount++;
        } catch (error) {
          console.error(`Failed to send reminder to user ${user.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      reminded: remindedCount,
      time: currentTime,
    });
  } catch (error) {
    console.error("Cron remind error:", error);
    return NextResponse.json(
      { error: "リマインド処理に失敗しました" },
      { status: 500 }
    );
  }
}
