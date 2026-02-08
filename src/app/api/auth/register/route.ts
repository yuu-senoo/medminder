import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db, initializeDatabase } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  name: z.string().min(1, "名前を入力してください"),
});

export async function POST(request: Request) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const id = uuidv4();

    await db.insert(users).values({
      id,
      email,
      name,
      passwordHash,
      createdAt: Math.floor(Date.now() / 1000),
    });

    return NextResponse.json({ message: "登録が完了しました" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "登録に失敗しました" },
      { status: 500 }
    );
  }
}
