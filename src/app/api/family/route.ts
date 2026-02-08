import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db, initializeDatabase } from "@/lib/db";
import { familyMembers, familyInvites, users } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { generateLinkCode } from "@/lib/utils";

export async function GET() {
  try {
    await initializeDatabase();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Get family members where I'm the owner or a member
    const members = await db
      .select()
      .from(familyMembers)
      .where(
        or(
          eq(familyMembers.ownerUserId, userId),
          eq(familyMembers.memberUserId, userId)
        )
      )
      .all();

    // Enrich with user data
    const enriched = [];
    for (const member of members) {
      const otherUserId =
        member.ownerUserId === userId
          ? member.memberUserId
          : member.ownerUserId;
      const otherUser = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, otherUserId))
        .get();

      enriched.push({
        ...member,
        user: otherUser,
        isOwner: member.ownerUserId === userId,
      });
    }

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Family fetch error:", error);
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
    const { role = "viewer" } = body;

    if (!["viewer", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "無効な権限です" },
        { status: 400 }
      );
    }

    const inviteCode = generateLinkCode();
    const id = uuidv4();

    await db.insert(familyInvites).values({
      id,
      ownerUserId: userId,
      inviteCode,
      role,
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      createdAt: Math.floor(Date.now() / 1000),
    });

    return NextResponse.json({ inviteCode }, { status: 201 });
  } catch (error) {
    console.error("Invite create error:", error);
    return NextResponse.json(
      { error: "招待コードの生成に失敗しました" },
      { status: 500 }
    );
  }
}
