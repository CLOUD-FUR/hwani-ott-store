// 관리자 대시보드 컴포넌트
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  totalRevenue: number;
  currentMonthOrders: number;
  totalUsers: number;
  pendingOrders: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('adminSession') !== 'true') {
      router.replace('/admin/login');
      return;
    }
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

        {/* 빠른 액세스 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <button
            onClick={() => router.push('/admin/users')}
            className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-sky-500 transition text-left"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-lg font-bold mb-1">사용자 관리</div>
            <div className="text-sm text-slate-400">회원 정보 및 등급</div>
          </button>
        </div>
      </div>
    </div>
  );
}
