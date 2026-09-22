"use client";

import { useEffect, useRef, useState } from "react";

type StatCardProps = {
  label: string;
  value: number;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
  accent?: string;
};

export default function StatCard({
  label,
  value,
  change,
  trend,
  icon,
  accent = "from-indigo-500 to-purple-600",
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (value <= 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 1200;
    const startTime = Date.now();

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOut = 1 - (1 - progress) ** 2;
      setDisplayValue(Math.floor(easeOut * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B] p-5 shadow-sm transition-all hover:shadow-md hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {fmt(displayValue)}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            trend === "up"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {trend === "up" ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 15 6-6 6 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
          {change}
        </span>
        <span className="text-xs text-slate-500">지난 달 대비</span>
      </div>
    </div>
  );
}
