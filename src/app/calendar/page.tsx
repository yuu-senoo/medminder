"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import Calendar, { addMonths, subMonths } from "@/components/Calendar";
import DayDetail from "@/components/DayDetail";

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: string;
  takenAt: string | null;
  source: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
}

export default function CalendarPage() {
  const { status } = useSession();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const [logsRes, medsRes] = await Promise.all([
        fetch(`/api/logs?startDate=${monthStart}&endDate=${monthEnd}`),
        fetch("/api/medications"),
      ]);

      const logsData = await logsRes.json();
      const medsData = await medsRes.json();

      setLogs(Array.isArray(logsData) ? logsData : []);
      setMedications(Array.isArray(medsData) ? medsData : []);
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        服薬カレンダー
      </h1>

      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-4">
        <Calendar
          currentMonth={currentMonth}
          logs={logs}
          onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
          onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
          onDayClick={(date) => setSelectedDate(date)}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-success/40" />
          全て服薬済み
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-warning/40" />
          一部飲み忘れ
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-danger/40" />
          未服薬
        </div>
      </div>

      {selectedDate && (
        <DayDetail
          date={selectedDate}
          logs={logs}
          medications={medications}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
