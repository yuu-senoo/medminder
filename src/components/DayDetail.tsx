"use client";

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: string;
  takenAt: string | null;
  source: string | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
}

interface DayDetailProps {
  date: string;
  logs: MedicationLog[];
  medications: Medication[];
  onClose: () => void;
}

export default function DayDetail({
  date,
  logs,
  medications,
  onClose,
}: DayDetailProps) {
  const dayLogs = logs
    .filter((l) => l.scheduledAt.slice(0, 10) === date)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const getMedName = (medicationId: string) => {
    return medications.find((m) => m.id === medicationId)?.name || "不明";
  };

  const getMedDosage = (medicationId: string) => {
    return medications.find((m) => m.id === medicationId)?.dosage || "";
  };

  const statusLabel = (status: string) => {
    return (
      {
        taken: "服薬済み",
        pending: "未服薬",
        skipped: "スキップ",
        missed: "飲み忘れ",
      }[status] || status
    );
  };

  const statusColor = (status: string) => {
    return (
      {
        taken: "text-success",
        pending: "text-warning",
        skipped: "text-gray-400",
        missed: "text-danger",
      }[status] || "text-gray-500"
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-surface-dark p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-lg">{date}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {dayLogs.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-4">
              この日の記録はありません
            </p>
          ) : (
            <div className="space-y-3">
              {dayLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100">
                      {getMedName(log.medicationId)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getMedDosage(log.medicationId)} ・{" "}
                      {log.scheduledAt.slice(11, 16)}予定
                    </div>
                    {log.takenAt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {log.takenAt.slice(11, 16)}に服薬（{log.source === "line" ? "LINE" : "Web"}）
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${statusColor(log.status)}`}
                  >
                    {statusLabel(log.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
