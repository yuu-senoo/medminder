"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import MedicationCard from "@/components/MedicationCard";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  scheduleTimes: string;
  scheduleType: string;
  isActive: number;
}

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: string;
  takenAt: string | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [medsRes, logsRes] = await Promise.all([
        fetch("/api/medications"),
        fetch(`/api/logs?startDate=${today}&endDate=${today}`),
      ]);
      const medsData = await medsRes.json();
      const logsData = await logsRes.json();
      setMedications(Array.isArray(medsData) ? medsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleTaken = async (logId: string) => {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "taken",
          takenAt: new Date().toISOString(),
          source: "web",
        }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update log:", error);
    }
  };

  const handleSkip = async (logId: string) => {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped", source: "web" }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update log:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  const activeMeds = medications.filter((m) => m.isActive);
  const totalLogs = logs.length;
  const takenLogs = logs.filter((l) => l.status === "taken").length;
  const pendingLogs = logs.filter((l) => l.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          こんにちは、{session?.user?.name}さん
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          今日の服薬状況
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-primary">{totalLogs}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            今日の予定
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-success">{takenLogs}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            服薬済み
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-warning">{pendingLogs}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            未服薬
          </div>
        </div>
      </div>

      {/* Medication cards */}
      <div className="space-y-4">
        {activeMeds.length === 0 ? (
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              まだお薬が登録されていません
            </p>
            <button
              onClick={() => router.push("/medications")}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
            >
              お薬を登録する
            </button>
          </div>
        ) : (
          activeMeds.map((med) => (
            <MedicationCard
              key={med.id}
              medication={med}
              logs={logs.filter((l) => l.medicationId === med.id)}
              onTaken={handleTaken}
              onSkip={handleSkip}
            />
          ))
        )}
      </div>
    </div>
  );
}
