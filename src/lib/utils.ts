import { TZDate } from "@date-fns/tz";

const TIMEZONE = "Asia/Tokyo";

export function nowJST(): Date {
  return new TZDate(new Date(), TIMEZONE);
}

export function toJSTDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new TZDate(d, TIMEZONE);
}

export function formatDateJST(date: Date | string, fmt?: string): string {
  const d = toJSTDate(date);
  if (fmt === "YYYY-MM-DD") {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (fmt === "HH:mm") {
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${min}`;
  }
  return d.toISOString();
}

export function todayJST(): string {
  return formatDateJST(nowJST(), "YYYY-MM-DD");
}

export function getDayOfWeek(date: Date | string): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const d = toJSTDate(date);
  return days[d.getDay()];
}

export function shouldTakeMedicationOnDate(
  medication: {
    scheduleType: string;
    scheduleDays: string | null;
    scheduleInterval: number | null;
    startDate: string;
    endDate: string | null;
    isActive: number;
  },
  dateStr: string
): boolean {
  if (!medication.isActive) return false;

  if (dateStr < medication.startDate) return false;
  if (medication.endDate && dateStr > medication.endDate) return false;

  if (medication.scheduleType === "daily") return true;

  if (medication.scheduleType === "specific_days" && medication.scheduleDays) {
    const days: string[] = JSON.parse(medication.scheduleDays);
    const dayOfWeek = getDayOfWeek(dateStr + "T00:00:00+09:00");
    return days.includes(dayOfWeek);
  }

  if (
    medication.scheduleType === "interval" &&
    medication.scheduleInterval
  ) {
    const start = new Date(medication.startDate + "T00:00:00+09:00");
    const target = new Date(dateStr + "T00:00:00+09:00");
    const diffDays = Math.floor(
      (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays % medication.scheduleInterval === 0;
  }

  return false;
}

export function generateLinkCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
