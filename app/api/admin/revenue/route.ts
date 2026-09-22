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
    const [monthOrders, yearOrders, yearSum, totalSum, lastMonthSum, topItems] = await Promise.all([
      prisma.order.findMany({ where: { ...completed, completedAt: { gte: start, lt: end } }, select: { totalAmount: true, completedAt: true } }),
      prisma.order.findMany({ where: { ...completed, completedAt: { gte: yearStart, lt: new Date(year + 1, 0, 1) } }, select: { totalAmount: true, completedAt: true } }),
      prisma.order.aggregate({ where: { ...completed, completedAt: { gte: yearStart, lt: new Date(year + 1, 0, 1) } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: completed, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { ...completed, completedAt: { gte: monthStart(year, month - 1), lt: start } }, _sum: { totalAmount: true } }),
      prisma.orderItem.findMany({ where: { order: { ...completed, completedAt: { gte: start, lt: end } } }, include: { product: { select: { name: true } } }, }),
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
    const topProducts = [...productMap.entries()].map(([productName, values]) => ({ productName, ...values })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    return NextResponse.json({ success: true, data: {
      totalRevenue: totalSum._sum.totalAmount || 0,
      currentMonthRevenue: monthOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      lastMonthRevenue: lastMonthSum._sum.totalAmount || 0,
      currentYearRevenue: yearSum._sum.totalAmount || 0,
      dailyRevenue,
      monthlyRevenue: Array.from({ length: 12 }, (_, index) => { const monthStartDate = new Date(year, index, 1); const monthEndDate = new Date(year, index + 1, 1); const orders = yearOrders.filter((order) => order.completedAt && order.completedAt >= monthStartDate && order.completedAt < monthEndDate); return { month: `${year}-${String(index + 1).padStart(2, '0')}`, revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0), orders: orders.length }; }),
      topProducts,
    } });
  } catch (error) {
    console.error('Admin revenue fetch error:', error);
    return NextResponse.json({ success: false, error: '매출을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
