import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';

const monthStart = (year: number, month: number) => new Date(year, month - 1, 1);

export async function GET(request: Request) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const selected = new URL(request.url).searchParams.get('month');
    const [year, month] = (selected || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const start = monthStart(year, month);
    const end = monthStart(year, month + 1);
    const yearStart = new Date(year, 0, 1);
    const now = new Date();
    const completed = { status: 'COMPLETED' as const };
    const [monthOrders, yearOrders, yearSum, totalSum, lastMonthSum, topItems, allCompletedOrders, allProducts] = await Promise.all([
      prisma.order.findMany({ where: { ...completed, completedAt: { gte: start, lt: end } }, select: { totalAmount: true, completedAt: true } }),
      prisma.order.findMany({ where: { ...completed, completedAt: { gte: yearStart, lt: new Date(year + 1, 0, 1) } }, select: { totalAmount: true, completedAt: true } }),
      prisma.order.aggregate({ where: { ...completed, completedAt: { gte: yearStart, lt: new Date(year + 1, 0, 1) } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: completed, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { ...completed, completedAt: { gte: monthStart(year, month - 1), lt: start } }, _sum: { totalAmount: true } }),
      prisma.orderItem.findMany({ where: { order: { ...completed, completedAt: { gte: start, lt: end } } }, include: { product: { select: { name: true } } }, }),
      prisma.order.findMany({ where: completed, select: { totalAmount: true, completedAt: true } }),
      prisma.product.findMany({ select: { id: true, name: true, clicks: true, sales: true } }),
    ]);
    const dailyRevenue = Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => {
      const date = new Date(year, month - 1, index + 1);
      const orders = monthOrders.filter((order) => order.completedAt?.toDateString() === date.toDateString());
      return { date: date.toISOString().slice(0, 10), revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0), orders: orders.length };
    });
    const productMap = new Map<string, { revenue: number; count: number }>();
    for (const item of topItems) {
      const current = productMap.get(item.product.name) || { revenue: 0, count: 0 };
      current.revenue += item.price * item.quantity;
      current.count += item.quantity;
      productMap.set(item.product.name, current);
    }
    const productClicksMap = new Map(allProducts.map((p) => [p.name, p.clicks]));
    const topProducts = [...productMap.entries()].map(([productName, values]) => ({
      productName,
      ...values,
      clicks: productClicksMap.get(productName) || 0,
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Click stats: all products sorted by clicks descending, top 10
    const clickStats = allProducts
      .map((p) => ({
        productId: p.id,
        name: p.name,
        clicks: p.clicks,
        sales: p.sales,
        conversionRate: p.clicks > 0 ? Number(((p.sales / p.clicks) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Weekly revenue: last 8 weeks relative to selected month (week starting Monday)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const mondayOfLastWeek = new Date(monthEnd);
    const day = mondayOfLastWeek.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    mondayOfLastWeek.setDate(mondayOfLastWeek.getDate() + offset);
    mondayOfLastWeek.setHours(0, 0, 0, 0);

    const weeklyRevenue = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(mondayOfLastWeek);
      weekStart.setDate(mondayOfLastWeek.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekOrders = allCompletedOrders.filter(
        (order) => order.completedAt && order.completedAt >= weekStart && order.completedAt <= weekEnd
      );
      weeklyRevenue.push({
        weekStart: weekStart.toISOString().slice(0, 10),
        revenue: weekOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        orders: weekOrders.length,
      });
    }

    // All-time revenue summary + monthly trend across all months with completed orders
    const allTimeOrderCount = allCompletedOrders.length;
    const allTimeTotal = totalSum._sum.totalAmount || 0;
    const allTimeRevenue = {
      total: allTimeTotal,
      orders: allTimeOrderCount,
      averageOrderValue: allTimeOrderCount > 0 ? Math.round(allTimeTotal / allTimeOrderCount) : 0,
    };

    const monthlyMap = new Map<string, { revenue: number; orders: number }>();
    for (const order of allCompletedOrders) {
      if (!order.completedAt) continue;
      const monthKey = `${order.completedAt.getFullYear()}-${String(order.completedAt.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(monthKey) || { revenue: 0, orders: 0 };
      current.revenue += order.totalAmount;
      current.orders += 1;
      monthlyMap.set(monthKey, current);
    }
    const monthlyTrend = [...monthlyMap.entries()]
      .map(([month, values]) => ({ month, revenue: values.revenue, orders: values.orders }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ success: true, data: {
      totalRevenue: totalSum._sum.totalAmount || 0,
      currentMonthRevenue: monthOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      lastMonthRevenue: lastMonthSum._sum.totalAmount || 0,
      currentYearRevenue: yearSum._sum.totalAmount || 0,
      dailyRevenue,
      monthlyRevenue: Array.from({ length: 12 }, (_, index) => { const monthStartDate = new Date(year, index, 1); const monthEndDate = new Date(year, index + 1, 1); const orders = yearOrders.filter((order) => order.completedAt && order.completedAt >= monthStartDate && order.completedAt < monthEndDate); return { month: `${year}-${String(index + 1).padStart(2, '0')}`, revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0), orders: orders.length }; }),
      topProducts,
      clickStats,
      weeklyRevenue,
      allTimeRevenue,
      monthlyTrend,
    } });
  } catch (error) {
    console.error('Admin revenue fetch error:', error);
    return NextResponse.json({ success: false, error: '매출을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
