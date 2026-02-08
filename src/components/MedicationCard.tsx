"use client";

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: string;
  takenAt: string | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  scheduleTimes: string;
  scheduleType: string;
  isActive: number;
}

interface MedicationCardProps {
  medication: Medication;
  logs: MedicationLog[];
  onTaken: (logId: string) => void;
  onSkip: (logId: string) => void;
}

export default function MedicationCard({
  medication,
  logs,
  onTaken,
  onSkip,
}: MedicationCardProps) {
  const times: string[] = JSON.parse(medication.scheduleTimes);

  const scheduleLabel = {
    daily: "毎日",
    specific_days: "特定曜日",
    interval: "間隔",
  }[medication.scheduleType] || medication.scheduleType;

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {medication.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {medication.dosage} ・ {scheduleLabel} ・{" "}
            {times.join(", ")}
          </p>
        </div>
        {!medication.isActive && (
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
            停止中
          </span>
        )}
      </div>

      {logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <StatusBadge status={log.status} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {log.scheduledAt.slice(11, 16)}
                </span>
              </div>

              {log.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onTaken(log.id)}
                    className="px-3 py-1 text-sm bg-success/20 text-success hover:bg-success/30 rounded-lg font-medium transition-colors"
                  >
                    飲んだ
                  </button>
                  <button
                    onClick={() => onSkip(log.id)}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    スキップ
                  </button>
                </div>
              )}

              {log.status === "taken" && log.takenAt && (
                <span className="text-xs text-gray-400">
                  {log.takenAt.slice(11, 16)} に服薬
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          今日の服薬予定はありません
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: "bg-warning/20", text: "text-warning", label: "未" },
    taken: { bg: "bg-success/20", text: "text-success", label: "済" },
    skipped: { bg: "bg-gray-200 dark:bg-gray-700", text: "text-gray-500", label: "ー" },
    missed: { bg: "bg-danger/20", text: "text-danger", label: "忘" },
  }[status] || { bg: "bg-gray-200", text: "text-gray-500", label: "?" };

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
