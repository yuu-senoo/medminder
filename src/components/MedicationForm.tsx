"use client";

import { useState } from "react";

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

interface MedicationFormProps {
  initialData?: MedicationFormData;
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const DAYS_OF_WEEK = [
  { value: "mon", label: "月" },
  { value: "tue", label: "火" },
  { value: "wed", label: "水" },
  { value: "thu", label: "木" },
  { value: "fri", label: "金" },
  { value: "sat", label: "土" },
  { value: "sun", label: "日" },
];

export default function MedicationForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}: MedicationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [dosage, setDosage] = useState(initialData?.dosage || "");
  const [scheduleType, setScheduleType] = useState<
    "daily" | "specific_days" | "interval"
  >(initialData?.scheduleType || "daily");
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(
    initialData?.scheduleTimes || ["08:00"]
  );
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    initialData?.scheduleDays || []
  );
  const [scheduleInterval, setScheduleInterval] = useState<number>(
    initialData?.scheduleInterval || 2
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [note, setNote] = useState(initialData?.note || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addTime = () => {
    setScheduleTimes([...scheduleTimes, "12:00"]);
  };

  const removeTime = (index: number) => {
    setScheduleTimes(scheduleTimes.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    const updated = [...scheduleTimes];
    updated[index] = value;
    setScheduleTimes(updated);
  };

  const toggleDay = (day: string) => {
    if (scheduleDays.includes(day)) {
      setScheduleDays(scheduleDays.filter((d) => d !== day));
    } else {
      setScheduleDays([...scheduleDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit({
        name,
        dosage,
        scheduleType,
        scheduleTimes,
        scheduleDays: scheduleType === "specific_days" ? scheduleDays : null,
        scheduleInterval: scheduleType === "interval" ? scheduleInterval : null,
        startDate,
        endDate: endDate || null,
        note: note || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-6 space-y-5"
    >
      <h2 className="text-lg font-semibold">
        {isEditing ? "お薬を編集" : "新しいお薬を登録"}
      </h2>

      {error && (
        <div className="p-3 bg-danger/10 text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          薬の名前 <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          placeholder="例: ロキソニン"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          用量 <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          placeholder="例: 1錠"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          スケジュール
        </label>
        <div className="flex gap-2">
          {[
            { value: "daily", label: "毎日" },
            { value: "specific_days", label: "特定曜日" },
            { value: "interval", label: "n日おき" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setScheduleType(
                  opt.value as "daily" | "specific_days" | "interval"
                )
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scheduleType === opt.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {scheduleType === "specific_days" && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            曜日を選択
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  scheduleDays.includes(day.value)
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {scheduleType === "interval" && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            間隔（日数）
          </label>
          <input
            type="number"
            min={2}
            value={scheduleInterval}
            onChange={(e) => setScheduleInterval(parseInt(e.target.value) || 2)}
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          <span className="ml-2 text-sm text-gray-500">日おき</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          リマインド時刻
        </label>
        {scheduleTimes.map((time, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              type="time"
              value={time}
              onChange={(e) => updateTime(index, e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {scheduleTimes.length > 1 && (
              <button
                type="button"
                onClick={() => removeTime(index)}
                className="p-2 text-gray-400 hover:text-danger transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addTime}
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          + 時刻を追加
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            開始日
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            終了日（任意）
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          メモ（任意）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
          placeholder="食後に服用、など"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "保存中..." : isEditing ? "更新する" : "登録する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
