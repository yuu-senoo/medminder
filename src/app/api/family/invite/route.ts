import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db, initializeDatabase } from "@/lib/db";
import { familyMembers, familyInvites } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    await initializeDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: "招待コードを入力してください" },
        { status: 400 }
      );
    }

    // Find valid invite
    const invite = await db
      .select()
      .from(familyInvites)
      .where(eq(familyInvites.inviteCode, inviteCode))
      .get();

    if (!invite) {
      return NextResponse.json(
        { error: "招待コードが見つかりません" },
        { status: 404 }
      );
    }

    if (invite.usedByUserId) {
      return NextResponse.json(
        { error: "この招待コードは既に使用されています" },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (invite.expiresAt < now) {
      return NextResponse.json(
        { error: "招待コードの有効期限が切れています" },
        { status: 400 }
      );
    }

    if (invite.ownerUserId === userId) {
      return NextResponse.json(
        { error: "自分の招待コードは使用できません" },
        { status: 400 }
      );
    }

    // Check if already a family member
    const existing = await db
      .select()
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.ownerUserId, invite.ownerUserId),
          eq(familyMembers.memberUserId, userId)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "既に家族メンバーとして登録されています" },
        { status: 400 }
      );
    }

    // Create family member relationship
    const id = uuidv4();
    await db.insert(familyMembers).values({
      id,
      ownerUserId: invite.ownerUserId,
      memberUserId: userId,
      role: invite.role,
      createdAt: now,
    });

    // Mark invite as used
    await db
      .update(familyInvites)
      .set({ usedByUserId: userId })
      .where(eq(familyInvites.id, invite.id));

    return NextResponse.json({ message: "家族メンバーとして登録されました" });
  } catch (error) {
    console.error("Family invite accept error:", error);
    return NextResponse.json(
      { error: "招待の受け入れに失敗しました" },
      { status: 500 }
    );
  }
}
