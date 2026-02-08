"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LineConnect from "@/components/LineConnect";
import FamilyList from "@/components/FamilyList";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        設定
      </h1>

      {/* Profile info */}
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">プロフィール</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              名前
            </label>
            <p className="font-medium">{session?.user?.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">
              メールアドレス
            </label>
            <p className="font-medium">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* LINE Connect */}
      <div className="mb-6">
        <LineConnect />
      </div>

      {/* Family sharing */}
      <FamilyList />
    </div>
  );
}
