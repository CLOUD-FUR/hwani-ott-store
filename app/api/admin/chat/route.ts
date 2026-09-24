import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';
import { createLog } from '@/lib/logger';

// 채팅방 목록: 각 방의 최신 메시지 + 미확인 메시지 수
async function getRooms() {
  // 미확인 메시지 수 (senderType: "user" AND readAt IS NULL)
  const unreadCounts = await prisma.message.groupBy({
    by: ['roomId'],
    where: { senderType: 'user', readAt: null },
    _count: { _all: true },
  });
  const unreadCountMap = new Map(unreadCounts.map((r) => [r.roomId, r._count._all]));

  // 최근 메시지들 (createdAt DESC), 방별로 가장 최근 메시지 찾기
  const recentMessages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const roomMap = new Map<string, (typeof recentMessages)[number]>();
  for (const msg of recentMessages) {
    if (!roomMap.has(msg.roomId)) {
      roomMap.set(msg.roomId, msg);
    }
  }

  const rooms = Array.from(roomMap.entries()).map(([roomId, latestMessage]) => ({
    roomId,
    latestMessage,
    unreadCount: unreadCountMap.get(roomId) || 0,
  }));

  // 최신 메시지 시간 기준 내림차순 정렬
  rooms.sort(
    (a, b) =>
      new Date(b.latestMessage.createdAt).getTime() -
      new Date(a.latestMessage.createdAt).getTime()
  );

  return rooms;
}

export async function GET(request: Request) {
  if (!(await getAdminUsername()))
    return NextResponse.json(
      { success: false, error: '관리자 로그인이 필요합니다.' },
      { status: 401 }
    );

  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // roomId가 없으면 방 목록 반환
    if (!roomId) {
      const rooms = await getRooms();
      return NextResponse.json({
        success: true,
        data: { rooms },
      });
    }

    // roomId가 있으면 해당 방의 메시지 조회 (페이징)
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.message.count({ where: { roomId } });

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.reverse(), // 오름차순 (시간순)으로 재전송
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Chat fetch error:', error);
    return NextResponse.json(
      { success: false, error: '채팅을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await getAdminUsername()))
    return NextResponse.json(
      { success: false, error: '관리자 로그인이 필요합니다.' },
      { status: 401 }
    );

  try {
    const { roomId, content } = await request.json();

    if (typeof roomId !== 'string' || roomId.length === 0) {
      return NextResponse.json(
        { success: false, error: 'roomId를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '메시지 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: '메시지는 2000자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        senderType: 'admin',
        senderId: null,
        content,
        readAt: null,
      },
    });

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '채팅 메시지 발신',
      details: { roomId, messageId: message.id },
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json(
      { success: false, error: '메시지 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await getAdminUsername()))
    return NextResponse.json(
      { success: false, error: '관리자 로그인이 필요합니다.' },
      { status: 401 }
    );

  try {
    const { roomId } = await request.json();

    if (typeof roomId !== 'string' || roomId.length === 0) {
      return NextResponse.json(
        { success: false, error: 'roomId를 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await prisma.message.updateMany({
      where: {
        roomId,
        senderType: 'user',
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    console.error('Chat read mark error:', error);
    return NextResponse.json(
      { success: false, error: '읽음 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
