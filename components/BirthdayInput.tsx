"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MONTHS: { value: string; label: string }[] = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
];

// No year is recorded, so Feb allows 29 (for users born on a leap day).
const DAYS_IN_MONTH: Record<string, number> = {
  "01": 31, "02": 29, "03": 31, "04": 30, "05": 31, "06": 30,
  "07": 31, "08": 31, "09": 30, "10": 31, "11": 30, "12": 31
};

function parseBirthday(value: string): { month: string; day: string } {
  if (!value) return { month: "", day: "" };
  const short = value.match(/^(\d{2})-(\d{2})$/);
  if (short) return { month: short[1], day: short[2] };
  // Tolerate legacy YYYY-MM-DD values already stored in DynamoDB.
  const full = value.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (full) return { month: full[1], day: full[2] };
  return { month: "", day: "" };
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

export function BirthdayInput({ value, onChange, className, id }: Props) {
  const initial = parseBirthday(value);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    const p = parseBirthday(value);
    setMonth(p.month);
    setDay(p.day);
    lastEmitted.current = value;
  }, [value]);

  const maxDays = DAYS_IN_MONTH[month] ?? 31;

  function emit(nextMonth: string, nextDay: string) {
    const out = nextMonth && nextDay ? `${nextMonth}-${nextDay}` : "";
    lastEmitted.current = out;
    onChange(out);
  }

  function onMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    const dayNum = parseInt(day, 10);
    const newMax = DAYS_IN_MONTH[nextMonth] ?? 31;
    const adjustedDay = !Number.isNaN(dayNum) && dayNum > newMax ? "" : day;
    if (adjustedDay !== day) setDay(adjustedDay);
    emit(nextMonth, adjustedDay);
  }

  function onDayChange(nextDay: string) {
    setDay(nextDay);
    emit(month, nextDay);
  }

  const selectClass =
    "h-10 rounded-md border border-indigo-300/20 bg-slate-950 px-3 text-sm text-astral-text focus:outline-none focus:ring-1 focus:ring-astral-indigo disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)} id={id}>
      <select
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        className={selectClass}
        aria-label="Birthday month"
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={day}
        onChange={(e) => onDayChange(e.target.value)}
        disabled={!month}
        className={selectClass}
        aria-label="Birthday day"
      >
        <option value="">Day</option>
        {Array.from({ length: maxDays }, (_, i) => {
          const dd = String(i + 1).padStart(2, "0");
          return (
            <option key={dd} value={dd}>
              {i + 1}
            </option>
          );
        })}
      </select>
    </div>
  );
}
