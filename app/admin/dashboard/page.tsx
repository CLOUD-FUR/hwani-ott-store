// 관리자 대시보드 컴포넌트
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EmailLogSummary {
  id: string;
  recipient: string;
  subject: string;
  template: string;
  status: string;
  createdAt: string;
}

interface MessageSummary {
  id: string;
  roomId: string;
  senderType: string;
  content: string;
  createdAt: string;
}

interface Stats {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  totalRevenue: number;
  currentMonthOrders: number;
  totalUsers: number;
  pendingOrders: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  emailTotal?: number;
  emailFailed?: number;
  recentEmails?: EmailLogSummary[];
  chatTotal?: number;
  chatUnread?: number;
  recentMessages?: MessageSummary[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        cache: 'no-store',
      });

      if (!res.ok) {
        // Database가 아직 연결되지 않아도 관리자 화면은 열 수 있습니다.
        setStats({
          currentMonthRevenue: 0,
          lastMonthRevenue: 0,
          totalRevenue: 0,
          currentMonthOrders: 0,
          totalUsers: 0,
          pendingOrders: 0,
          dailyRevenue: [],
        });
        return;
      }

      const data = await res.json();
      setStats(data.data);
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  const revenueChange = stats
    ? ((stats.currentMonthRevenue - stats.lastMonthRevenue) / (stats.lastMonthRevenue || 1)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-width p-6">
        <h1 className="text-3xl font-bold mb-8">대시보드</h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">이번 달 매출</div>
            <div className="text-3xl font-bold text-sky-400 mb-2">
              {stats?.currentMonthRevenue.toLocaleString()}원
            </div>
            <div className={`text-sm ${revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {revenueChange >= 0 ? '▲' : '▼'} {Math.abs(revenueChange).toFixed(1)}%
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">총 매출</div>
            <div className="text-3xl font-bold text-slate-50">
              {stats?.totalRevenue.toLocaleString()}원
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">이번 달 주문</div>
            <div className="text-3xl font-bold text-slate-50">
              {stats?.currentMonthOrders}건
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">대기 중인 주문</div>
            <div className="text-3xl font-bold text-orange-400">
              {stats?.pendingOrders}건
            </div>
          </div>
        </div>

        {/* 최근 7일 매출 그래프 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">최근 7일 매출</h2>
          <div className="h-64 flex items-end justify-between gap-4">
            {stats?.dailyRevenue.map((day, index) => {
              const maxRevenue = Math.max(...(stats.dailyRevenue.map(d => d.revenue) || [1]));
              const height = (day.revenue / maxRevenue) * 100;

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-slate-800 rounded-t relative" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-t transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-2 text-center">
                    {new Date(day.date).getDate()}일
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {day.revenue > 0 ? `${(day.revenue / 1000).toFixed(0)}K` : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 이메일 / 채팅 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 최근 이메일 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">최근 이메일</h2>
              <button
                onClick={() => router.push('/admin/emails')}
                className="text-sm text-sky-400 hover:text-sky-300 transition"
              >
                전체 보기 →
              </button>
            </div>
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-slate-400">
                총 <b className="text-slate-200">{(stats?.emailTotal ?? 0).toLocaleString()}</b>건
              </span>
              <span className="text-slate-400">
                실패 <b className="text-red-400">{(stats?.emailFailed ?? 0).toLocaleString()}</b>건
              </span>
            </div>
            {stats?.recentEmails && stats.recentEmails.length > 0 ? (
              <ul className="space-y-3">
                {stats.recentEmails.map((email) => (
                  <li key={email.id} className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200" title={email.subject}>
                        {email.subject}
                      </p>
                      <p className="truncate text-xs text-slate-500">{email.recipient}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        email.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {email.status === 'sent' ? '성공' : '실패'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">발송된 이메일이 없습니다.</p>
            )}
          </div>

          {/* 최근 채팅 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">최근 채팅</h2>
              <button
                onClick={() => router.push('/admin/chat')}
                className="text-sm text-sky-400 hover:text-sky-300 transition"
              >
                전체 보기 →
              </button>
            </div>
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-slate-400">
                총 <b className="text-slate-200">{(stats?.chatTotal ?? 0).toLocaleString()}</b>건
              </span>
              <span className="text-slate-400">
                안 읽음 <b className="text-orange-400">{(stats?.chatUnread ?? 0).toLocaleString()}</b>건
              </span>
            </div>
            {stats?.recentMessages && stats.recentMessages.length > 0 ? (
              <ul className="space-y-3">
                {stats.recentMessages.map((message) => (
                  <li key={message.id} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs text-slate-500">{message.roomId}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          message.senderType === 'admin'
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {message.senderType === 'admin' ? '관리자' : '회원'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-300">{message.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">채팅 메시지가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 빠른 액세스 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-sky-500 transition text-left"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="text-lg font-bold mb-1">주문 관리</div>
            <div className="text-sm text-slate-400">주문 확인 및 처리</div>
          </button>

          <button
            onClick={() => router.push('/admin/products')}
            className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-sky-500 transition text-left"
          >
            <div className="text-2xl mb-2">🛍️</div>
            <div className="text-lg font-bold mb-1">상품 관리</div>
            <div className="text-sm text-slate-400">상품 등록 및 수정</div>
          </button>
        </div>
      </div>
    </div>
  );
}
