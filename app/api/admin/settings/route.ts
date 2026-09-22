import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';
import { createLog } from '@/lib/logger';
import { LogType } from '@prisma/client';

const publicAdminSettings = (settings: Awaited<ReturnType<typeof prisma.settings.findUnique>>) => settings ? {
  ...settings,
  storeName: settings.siteName,
  storeDescription: settings.siteDescription || '',
  kakaoChannelUrl: settings.kakaotalkUrl || '',
  bankHolder: settings.accountHolder || '',
  smtpPassword: '',
  googleClientSecret: '',
} : null;

export async function GET() {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'settings' } });
    return NextResponse.json({ success: true, data: publicAdminSettings(settings) });
  } catch (error) {
    console.error('Admin settings fetch error:', error);
    return NextResponse.json({ success: false, error: '설정을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const input = await request.json() as Record<string, unknown>;
    const numberOrNull = (value: unknown) => value === '' || value === null || value === undefined ? null : Number(value);
    const data = {
      siteName: String(input.siteName ?? input.storeName ?? '화니 OTT').trim(),
      siteDescription: String(input.siteDescription ?? input.storeDescription ?? ''),
      kakaotalkUrl: String(input.kakaotalkUrl ?? input.kakaoChannelUrl ?? ''),
      channelTalkUrl: String(input.channelTalkUrl ?? ''),
      googleClientId: String(input.googleClientId ?? ''),
      googleRedirectUri: String(input.googleRedirectUri ?? ''),
      bankName: String(input.bankName ?? ''),
      bankAccount: String(input.bankAccount ?? ''),
      accountHolder: String(input.accountHolder ?? input.bankHolder ?? ''),
      smtpHost: String(input.smtpHost ?? 'smtp.gmail.com'),
      smtpPort: numberOrNull(input.smtpPort),
      smtpUser: String(input.smtpUser ?? ''),
    };
    const settings = await prisma.settings.upsert({ where: { id: 'settings' }, update: data, create: { id: 'settings', ...data } });
    await createLog({ type: LogType.MODIFY, action: '관리자 설정 수정', details: { admin } });
    return NextResponse.json({ success: true, data: publicAdminSettings(settings) });
  } catch (error) {
    console.error('Admin settings update error:', error);
    return NextResponse.json({ success: false, error: '설정 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
