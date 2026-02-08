"use client";

import { useState, useEffect, useCallback } from "react";

interface FamilyMember {
  id: string;
  ownerUserId: string;
  memberUserId: string;
  role: string;
  isOwner: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function FamilyList() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [role, setRole] = useState<"viewer" | "admin">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/family");
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch family members:", error);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const generateInvite = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "招待コードの生成に失敗しました");
        return;
      }

      setGeneratedCode(data.inviteCode);
    } catch {
      setError("招待コードの生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "招待の受け入れに失敗しました");
        return;
      }

      setSuccess("家族メンバーとして登録されました");
      setInviteCode("");
      fetchMembers();
    } catch {
      setError("招待の受け入れに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">家族共有</h2>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Members list */}
      {members.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            メンバー
          </h3>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div>
                  <span className="font-medium text-sm">
                    {member.user.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {member.user.email}
                  </span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {member.role === "admin" ? "管理者" : "閲覧者"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate invite */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          招待コードを発行
        </h3>
        <div className="flex gap-2 mb-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "viewer" | "admin")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="viewer">閲覧者</option>
            <option value="admin">管理者</option>
          </select>
          <button
            onClick={generateInvite}
            disabled={loading}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            発行
          </button>
        </div>
        {generatedCode && (
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              招待コード（24時間有効）:
            </p>
            <p className="text-lg font-mono font-bold text-primary mt-1">
              {generatedCode}
            </p>
          </div>
        )}
      </div>

      {/* Accept invite */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          招待コードで参加
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="招待コードを入力"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={acceptInvite}
            disabled={loading || !inviteCode.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            参加
          </button>
        </div>
      </div>
    </div>
  );
}
