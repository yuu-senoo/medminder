/**
 * 服薬リマインド用 Cloudflare Worker (Cron Trigger)
 *
 * 5分ごとに発火し、Next.js アプリの /api/cron/remind を叩くだけの軽量Worker。
 * fetch の待ち時間は CPU 時間に含まれないため、無料プランの 10ms CPU 制限に
 * 収まる。実際のリマインド判定・LINE送信はすべてアプリ側で行う。
 *
 * cron スケジュールは wrangler.toml の [triggers] で設定。
 */

export interface Env {
  /** アプリのベースURL (例: https://kusuri-log.example.com) */
  APP_URL: string;
  /** /api/cron/remind の Bearer 認証に使うシークレット */
  CRON_SECRET: string;
}

export default {
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const task = remind(env);
    // 応答を待ってログに残す（待機しても課金CPUには影響しない）
    ctx.waitUntil(task);
    await task;
  },
};

async function remind(env: Env): Promise<void> {
  if (!env.APP_URL || !env.CRON_SECRET) {
    console.error("APP_URL または CRON_SECRET が未設定です");
    return;
  }

  const url = `${env.APP_URL.replace(/\/$/, "")}/api/cron/remind`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`Remind failed: ${res.status} ${body}`);
      return;
    }
    console.log(`Remind ok: ${res.status} ${body}`);
  } catch (error) {
    console.error("Remind request error:", error);
  }
}
