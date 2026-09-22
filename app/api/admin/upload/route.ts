import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAdminUsername } from '@/lib/admin-auth';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxBytes = 5 * 1024 * 1024;
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export async function POST(request: Request) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: '이미지 파일을 선택해주세요.' }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size > maxBytes) return NextResponse.json({ success: false, error: 'JPG, PNG, WEBP, GIF 이미지만 5MB 이하로 업로드할 수 있습니다.' }, { status: 400 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ success: false, error: 'BLOB_READ_WRITE_TOKEN이 설정되지 않았습니다.' }, { status: 503 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = file.type === 'image/png' ? bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]) : file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : file.type === 'image/gif' ? String.fromCharCode(...bytes.slice(0, 6)) === 'GIF87a' || String.fromCharCode(...bytes.slice(0, 6)) === 'GIF89a' : bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!signature) return NextResponse.json({ success: false, error: '유효하지 않은 이미지 파일입니다.' }, { status: 400 });
  try {
    const blob = await put(`products/${crypto.randomUUID()}.${extensions[file.type]}`, file, { access: 'public', addRandomSuffix: false });
    return NextResponse.json({ success: true, url: blob.url, data: { url: blob.url } });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: '이미지 업로드에 실패했습니다.' }, { status: 502 });
  }
}
