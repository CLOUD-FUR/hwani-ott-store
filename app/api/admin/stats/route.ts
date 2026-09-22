import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';

export async function GET() {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 이번 달 매출
    const currentMonthRevenue = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    });

    // 지난 달 매출
    const lastMonthRevenue = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { totalAmount: true },
    });

    // 총 매출
    const totalRevenue = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true },
    });

    // 이번 달 주문 수
    const currentMonthOrders = await prisma.order.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // 총 사용자 수
    const totalUsers = await prisma.user.count();

    // 대기 중인 주문 수
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' },
    });

    // 최근 7일 매출 그래프
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // 일별 매출 집계
    const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = recentOrders.filter(
        (order: { createdAt: Date; totalAmount: number }) => order.createdAt >= date && order.createdAt < nextDate
      );

      const total = dayOrders.reduce((sum: number, order: { totalAmount: number }) => sum + order.totalAmount, 0);

      return {
        date: date.toISOString().split('T')[0],
        revenue: total,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        currentMonthRevenue: currentMonthRevenue._sum.totalAmount || 0,
        lastMonthRevenue: lastMonthRevenue._sum.totalAmount || 0,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        currentMonthOrders,
        totalUsers,
        pendingOrders,
        dailyRevenue,
      },
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { success: false, error: '통계를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
