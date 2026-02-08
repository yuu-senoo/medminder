"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import MedicationForm from "@/components/MedicationForm";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  scheduleType: "daily" | "specific_days" | "interval";
  scheduleTimes: string;
  scheduleDays: string | null;
  scheduleInterval: number | null;
  startDate: string;
  endDate: string | null;
  note: string | null;
  isActive: number;
}

interface MedicationFormData {
  name: string;
  dosage: string;
  scheduleType: "daily" | "specific_days" | "interval";
  scheduleTimes: string[];
  scheduleDays: string[] | null;
  scheduleInterval: number | null;
  startDate: string;
  endDate: string | null;
  note: string | null;
}

export default function MedicationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  const fetchMedications = useCallback(async () => {
    try {
      const res = await fetch("/api/medications");
      const data = await res.json();
      setMedications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch medications:", error);
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
      fetchMedications();
    }
  }, [status, router, fetchMedications]);

  const handleCreate = async (data: MedicationFormData) => {
    const res = await fetch("/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "登録に失敗しました");
    }

    setShowForm(false);
    fetchMedications();
  };

  const handleUpdate = async (data: MedicationFormData) => {
    if (!editingMed) return;

    const res = await fetch(`/api/medications/${editingMed.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "更新に失敗しました");
    }

    setEditingMed(null);
    fetchMedications();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお薬を削除しますか？")) return;

    try {
      await fetch(`/api/medications/${id}`, { method: "DELETE" });
      fetchMedications();
    } catch (error) {
      console.error("Failed to delete medication:", error);
    }
  };

  const handleToggleActive = async (med: Medication) => {
    try {
      await fetch(`/api/medications/${med.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: med.isActive ? 0 : 1 }),
      });
      fetchMedications();
    } catch (error) {
      console.error("Failed to toggle medication:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  const scheduleLabel = (type: string) =>
    ({ daily: "毎日", specific_days: "特定曜日", interval: "間隔" })[type] || type;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          お薬管理
        </h1>
        {!showForm && !editingMed && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
          >
            + 新規登録
          </button>
        )}
      </div>

      {(showForm || editingMed) && (
        <div className="mb-6">
          <MedicationForm
            initialData={
              editingMed
                ? {
                    name: editingMed.name,
                    dosage: editingMed.dosage,
                    scheduleType: editingMed.scheduleType,
                    scheduleTimes: JSON.parse(editingMed.scheduleTimes),
                    scheduleDays: editingMed.scheduleDays
                      ? JSON.parse(editingMed.scheduleDays)
                      : null,
                    scheduleInterval: editingMed.scheduleInterval,
                    startDate: editingMed.startDate,
                    endDate: editingMed.endDate,
                    note: editingMed.note,
                  }
                : undefined
            }
            onSubmit={editingMed ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingMed(null);
            }}
            isEditing={!!editingMed}
          />
        </div>
      )}

      <div className="space-y-3">
        {medications.length === 0 && !showForm ? (
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              登録されているお薬はありません
            </p>
          </div>
        ) : (
          medications.map((med) => {
            const times: string[] = JSON.parse(med.scheduleTimes);
            return (
              <div
                key={med.id}
                className={`bg-white dark:bg-surface-dark rounded-xl shadow-sm p-4 border ${
                  med.isActive
                    ? "border-gray-100 dark:border-gray-700"
                    : "border-gray-200 dark:border-gray-600 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                      {med.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {med.dosage} ・ {scheduleLabel(med.scheduleType)} ・{" "}
                      {times.join(", ")}
                    </p>
                    {med.note && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {med.note}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {med.startDate}〜{med.endDate || "継続中"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(med)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                        med.isActive
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {med.isActive ? "有効" : "停止中"}
                    </button>
                    <button
                      onClick={() => setEditingMed(med)}
                      className="p-2 text-gray-400 hover:text-primary transition-colors"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(med.id)}
                      className="p-2 text-gray-400 hover:text-danger transition-colors"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
