"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  status: string;
  takenAt: string | null;
}

interface CalendarProps {
  currentMonth: Date;
  logs: MedicationLog[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: string) => void;
}

export default function Calendar({
  currentMonth,
  logs,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}: CalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ja });
  const calendarEnd = endOfWeek(monthEnd, { locale: ja });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate daily status
  const getDayStatus = (dateStr: string) => {
    const dayLogs = logs.filter(
      (l) => l.scheduledAt.slice(0, 10) === dateStr
    );
    if (dayLogs.length === 0) return "none";

    const allTaken = dayLogs.every((l) => l.status === "taken");
    const allMissed = dayLogs.every(
      (l) => l.status === "missed" || l.status === "skipped"
    );
    const someTaken = dayLogs.some((l) => l.status === "taken");

    if (allTaken) return "all_taken";
    if (allMissed) return "all_missed";
    if (someTaken) return "partial";

    const hasPending = dayLogs.some((l) => l.status === "pending");
    if (hasPending) return "pending";

    return "partial";
  };

  // Calculate monthly rate
  const monthLogs = logs.filter((l) => {
    const d = l.scheduledAt.slice(0, 7);
    return d === format(currentMonth, "yyyy-MM");
  });
  const monthTotal = monthLogs.length;
  const monthTaken = monthLogs.filter((l) => l.status === "taken").length;
  const monthRate = monthTotal > 0 ? Math.round((monthTaken / monthTotal) * 100) : 0;

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "yyyy年M月", { locale: ja })}
          </h2>
          {monthTotal > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              服薬率: {monthRate}%
            </p>
          )}
        </div>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              i === 0
                ? "text-danger"
                : i === 6
                  ? "text-primary"
                  : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const status = getDayStatus(dateStr);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          const statusColors = {
            all_taken: "bg-success/20",
            partial: "bg-warning/20",
            all_missed: "bg-danger/20",
            pending: "bg-primary/10",
            none: "",
          };

          const statusIcons = {
            all_taken: "text-success",
            partial: "text-warning",
            all_missed: "text-danger",
            pending: "text-primary",
            none: "text-transparent",
          };

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                !inMonth
                  ? "text-gray-300 dark:text-gray-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              } ${statusColors[status]} ${today ? "ring-2 ring-primary" : ""}`}
            >
              <span className={today ? "font-bold" : ""}>{format(day, "d")}</span>
              {status !== "none" && inMonth && (
                <span className={`text-[10px] ${statusIcons[status]}`}>
                  {status === "all_taken"
                    ? "●"
                    : status === "partial"
                      ? "◐"
                      : status === "all_missed"
                        ? "●"
                        : "○"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { addMonths, subMonths };
