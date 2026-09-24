"use client";

import { useCallback, useEffect, useState } from "react";

type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  template: string;
  status: string;
  error: string | null;
  createdAt: string;
};

const templateLabels: Record<string, string> = {
  verification: "이메일 인증",
  order_confirmation: "주문 접수",
  order_status: "주문 상태 변경",
};

export default function AdminEmailsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (template !== "all") params.set("template", template);
      if (status !== "all") params.set("status", status);
      if (query) params.set("search", query);
      const response = await fetch(`/api/admin/emails?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "이메일 로그를 불러오지 못했습니다.");
        return;
      }
      setError("");
      setLogs(data.data.logs || []);
      setTotalPages(data.data.totalPages || 1);
      setTotal(data.data.total || 0);
    } catch {
      setError("이메일 로그를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, template, status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">이메일 관리</h1>
        <p className="mt-1 text-sm text-slate-400">
          발송된 모든 이메일 내역을 확인합니다. 총 {total.toLocaleString()}건
        </p>
      </div>

      {error && <p className="rounded-xl bg-red-500/10 p-4 text-red-300">{error}</p>}

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-[#1E293B] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-slate-400">검색</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                setQuery(search);
              }
            }}
            placeholder="수신자 이메일"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-slate-400">템플릿</span>
          <select
            value={template}
            onChange={(event) => {
              setPage(1);
              setTemplate(event.target.value);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">전체</option>
            <option value="verification">이메일 인증</option>
            <option value="order_confirmation">주문 접수</option>
            <option value="order_status">주문 상태 변경</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-slate-400">발송 상태</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">전체</option>
            <option value="sent">발송 성공</option>
            <option value="failed">발송 실패</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            onClick={() => {
              setPage(1);
              setQuery(search);
            }}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
          >
            검색
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#1E293B]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="p-4 font-medium">발송일시</th>
              <th className="p-4 font-medium">수신자</th>
              <th className="p-4 font-medium">제목</th>
              <th className="p-4 font-medium">템플릿</th>
              <th className="p-4 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400">
                  발송된 이메일이 없습니다.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800 last:border-0">
                  <td className="whitespace-nowrap p-4 text-slate-400">
                    {new Date(log.createdAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="p-4 text-slate-200">{log.recipient}</td>
                  <td className="max-w-xs truncate p-4 text-slate-200" title={log.subject}>
                    {log.subject}
                  </td>
                  <td className="p-4 text-slate-400">
                    {templateLabels[log.template] || log.template}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        log.status === "sent"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                      title={log.error || undefined}
                    >
                      {log.status === "sent" ? "성공" : "실패"}
                    </span>
                    {log.error && (
                      <p className="mt-1 max-w-xs truncate text-xs text-red-400/80" title={log.error}>
                        {log.error}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm transition hover:bg-slate-700 disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm transition hover:bg-slate-700 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
