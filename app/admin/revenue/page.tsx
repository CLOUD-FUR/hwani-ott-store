// 관리자 매출 관리 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RevenueStats {
  totalRevenue: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  currentYearRevenue: number;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  topProducts: Array<{ productName: string; revenue: number; count: number; clicks?: number }>;
  clickStats: Array<{ productId: string; name: string; clicks: number; sales: number; conversionRate: number }>;
  weeklyRevenue: Array<{ weekStart: string; revenue: number; orders: number }>;
  allTimeRevenue: { total: number; orders: number; averageOrderValue: number };
  monthlyTrend: Array<{ month: string; revenue: number; orders: number }>;
}

interface BarDataItem {
  revenue: number;
  orders: number;
}

function renderBars(data: BarDataItem[], labelFn: (item: BarDataItem, index: number) => string) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">데이터가 없습니다.</div>
    );
  }
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return data.map((item, index) => {
    const height = (item.revenue / maxRevenue) * 100;

    return (
      <div key={index} className="flex-1 flex flex-col items-center group">
        <div
          className="w-full bg-slate-800 rounded-t relative"
          style={{ height: '100%' }}
        >
          <div
            className="absolute bottom-0 w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-t transition-all duration-500"
            style={{ height: `${height}%` }}
          />
          {/* 툴팁 */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
            <div className="text-sky-400 font-bold">
              {item.revenue.toLocaleString()}원
            </div>
            <div className="text-slate-400">{item.orders}건</div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 text-center">
          {labelFn(item, index)}
        </div>
      </div>
    );
  });
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    fetchStats();
  }, [selectedMonth]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/admin/revenue?month=${selectedMonth}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setStats(data.data);
    } catch (error) {
      console.error('Revenue fetch error:', error);
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

  const showMonthInput = viewMode !== 'all';

  let chartData: BarDataItem[] = [];
  let chartLabels: (item: BarDataItem, index: number) => string = () => '';

  if (viewMode === 'daily' && stats?.dailyRevenue) {
    chartData = stats.dailyRevenue;
    chartLabels = (_item, index) => `${new Date(stats.dailyRevenue[index].date).getDate()}일`;
  } else if (viewMode === 'weekly' && stats?.weeklyRevenue) {
    chartData = stats.weeklyRevenue;
    chartLabels = (_item, index) => {
      const d = new Date(stats.weeklyRevenue[index].weekStart);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };
  } else if (viewMode === 'monthly' && stats?.monthlyRevenue) {
    chartData = stats.monthlyRevenue;
    chartLabels = (_item, index) => stats.monthlyRevenue[index].month.slice(-5);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-width p-6">
        <h1 className="text-3xl font-bold mb-8">매출 관리</h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">총 매출</div>
            <div className="text-3xl font-bold text-slate-50">
              {stats?.totalRevenue.toLocaleString()}원
            </div>
          </div>

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
            <div className="text-slate-400 text-sm mb-2">지난 달 매출</div>
            <div className="text-3xl font-bold text-slate-50">
              {stats?.lastMonthRevenue.toLocaleString()}원
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-2">올해 매출</div>
            <div className="text-3xl font-bold text-slate-50">
              {stats?.currentYearRevenue.toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 차트 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">매출 추이</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded transition ${
                  viewMode === 'daily'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                일간
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 rounded transition ${
                  viewMode === 'weekly'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                주간
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded transition ${
                  viewMode === 'monthly'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded transition ${
                  viewMode === 'all'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                전체
              </button>
              {showMonthInput && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-sky-500"
                />
              )}
            </div>
          </div>

          {viewMode === 'all' ? (
            <>
              {/* 전체 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-6">
                  <div className="text-slate-400 text-sm mb-2">전체 매출</div>
                  <div className="text-2xl font-bold text-slate-50">
                    {stats?.allTimeRevenue?.total.toLocaleString()}원
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-6">
                  <div className="text-slate-400 text-sm mb-2">전체 주문수</div>
                  <div className="text-2xl font-bold text-sky-400">
                    {stats?.allTimeRevenue?.orders}건
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-6">
                  <div className="text-slate-400 text-sm mb-2">평균 주문금액</div>
                  <div className="text-2xl font-bold text-slate-50">
                    {stats?.allTimeRevenue?.averageOrderValue.toLocaleString()}원
                  </div>
                </div>
              </div>

              {/* 월간 추세 차트 (전체) */}
              <div className="h-80 flex items-end justify-between gap-2">
                {renderBars(
                  stats?.monthlyTrend || [],
                  (_item, index) => (stats?.monthlyTrend[index]?.month || '').slice(-5)
                )}
              </div>
            </>
          ) : (
            <div className="h-80 flex items-end justify-between gap-2">
              {renderBars(chartData, chartLabels)}
            </div>
          )}
        </div>

        {/* 인기 상품 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">인기 상품</h2>

          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0
                        ? 'bg-amber-500 text-white'
                        : index === 1
                        ? 'bg-slate-400 text-white'
                        : index === 2
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{product.productName}</div>
                    <div className="text-sm text-slate-400">{product.count}건 판매 · {product.clicks || 0}회 클릭</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-sky-400">
                      {product.revenue.toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">판매 데이터가 없습니다.</div>
          )}
        </div>

        {/* 제품 클릭 통계 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">제품 클릭 통계</h2>

          {stats?.clickStats && stats.clickStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 text-slate-400 font-medium">순위</th>
                    <th className="text-left py-3 text-slate-400 font-medium">상품명</th>
                    <th className="text-right py-3 text-slate-400 font-medium">클릭수</th>
                    <th className="text-right py-3 text-slate-400 font-medium">판매수</th>
                    <th className="text-right py-3 text-slate-400 font-medium">전환율</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.clickStats.map((product, index) => (
                    <tr key={product.productId} className="border-b border-slate-800/50">
                      <td className="py-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            index === 0
                              ? 'bg-amber-500 text-white'
                              : index === 1
                              ? 'bg-slate-400 text-white'
                              : index === 2
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 font-medium">{product.name}</td>
                      <td className="py-3 text-right text-sky-400">{product.clicks.toLocaleString()}</td>
                      <td className="py-3 text-right">{product.sales.toLocaleString()}</td>
                      <td className="py-3 text-right">{product.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">클릭 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
