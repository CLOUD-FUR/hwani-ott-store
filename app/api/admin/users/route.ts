import { Prisma, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';

export async function GET(request: Request) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const isBlacklisted = searchParams.get('isBlacklisted');

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
        { uniqueId: { contains: search } },
      ];
    }

    if (tier) {
      if (Object.values(Role).includes(tier as Role)) where.tier = tier as Role;
    }

    if (isBlacklisted !== null && isBlacklisted !== undefined) {
      where.isBlacklisted = isBlacklisted === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          uniqueId: true,
          tier: true,
          provider: true,
          isVerified: true,
          isBlacklisted: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json(
      { success: false, error: '사용자 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
