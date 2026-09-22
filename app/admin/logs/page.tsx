// 관리자 로그 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Log {
  id: string;
  type: string;
  userId: string | null;
  email: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, page]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setLogs(data.data.logs);
      setTotalPages(data.data.totalPages);
    } catch (error) {
      console.error('Logs fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  const logTypeNames: Record<string, string> = {
    access: '접근',
    signup: '회원가입',
    admin: '관리자',
    order: '주문',
    payment: '결제',
    product: '상품',
    user: '사용자',
  };

  const logTypeColors: Record<string, string> = {
    access: 'text-slate-400 bg-slate-500/10',
    signup: 'text-emerald-400 bg-emerald-500/10',
    admin: 'text-orange-400 bg-orange-500/10',
    order: 'text-sky-400 bg-sky-500/10',
    payment: 'text-purple-400 bg-purple-500/10',
    product: 'text-amber-400 bg-amber-500/10',
    user: 'text-cyan-400 bg-cyan-500/10',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-width p-6">
        <h1 className="text-3xl font-bold mb-8">시스템 로그</h1>

        {/* 필터 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">로그 유형</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
              >
                <option value="all">전체</option>
                <option value="access">접근</option>
                <option value="signup">회원가입</option>
                <option value="admin">관리자</option>
                <option value="order">주문</option>
                <option value="payment">결제</option>
                <option value="product">상품</option>
                <option value="user">사용자</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition"
              >
                필터 적용
              </button>
            </div>
          </div>
        </div>

        {/* 로그 테이블 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">시간</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">유형</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">사용자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            logTypeColors[log.type] || 'text-slate-400 bg-slate-500/10'
                          }`}
                        >
                          {logTypeNames[log.type] || log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.email ? (
                          <div>
                            <div className="text-slate-300">{log.email}</div>
                            {log.userId && (
                              <div className="text-xs text-slate-500 font-mono">{log.userId}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{log.action}</td>
                      <td className="px-4 py-3 text-sm">
                        {log.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-sky-400 hover:text-sky-300">
                              상세 보기
                            </summary>
                            <pre className="mt-2 text-xs bg-slate-800/50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(JSON.parse(log.details), null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              이전
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-4 py-2 rounded transition ${
                      page === pageNum
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
