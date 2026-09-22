import { NextResponse } from 'next/server';
import { getAdminUsername } from '@/lib/admin-auth';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: '이미지 파일을 선택해주세요.' }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size > maxBytes) return NextResponse.json({ success: false, error: 'JPG, PNG, WEBP, GIF 이미지만 5MB 이하로 업로드할 수 있습니다.' }, { status: 400 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ success: false, error: '이미지 저장소가 설정되지 않았습니다. BLOB_READ_WRITE_TOKEN을 설정해주세요.' }, { status: 503 });
  return NextResponse.json({ success: false, error: 'Vercel Blob 업로드 어댑터가 아직 설치되지 않았습니다.' }, { status: 501 });
}
