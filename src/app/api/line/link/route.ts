import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { generateLinkCode } from "@/lib/utils";
import { storeLinkCode } from "@/app/api/line/webhook/route";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const code = generateLinkCode();
    storeLinkCode(code, userId);

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Link code generation error:", error);
    return NextResponse.json(
      { error: "コードの生成に失敗しました" },
      { status: 500 }
    );
  }
}
