'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { email: string; name: string | null; uniqueId: string; tier: string; provider: string; createdAt: string };

const tierLabels: Record<string, string> = {
  USER: '일반',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  DIAMOND: '다이아몬드',
};

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login?redirect=/user/profile');
        return;
      }
      const data = await response.json();
      const u = data.data.user as User;
      setUser(u);
      setName(u.name || '');
    })();
  }, [router]);

  if (!user) return <main className="min-h-screen bg-gray-50 p-12 text-center">불러오는 중...</main>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (data.success) {
      setSuccess('이름이 수정되었습니다.');
      setUser((prev) => (prev ? { ...prev, name } : prev));
    } else {
      setError(data.error || '오류가 발생했습니다.');
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/user" className="text-sm text-blue-600">← 내 정보</Link>
        <div className="mt-4 rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">회원 정보 확인/수정</h1>

          <dl className="mt-8 divide-y divide-gray-100">
            {[
              ['회원 고유번호', user.uniqueId],
              ['이메일', user.email],
              ['가입 방식', user.provider === 'google' ? 'Google' : '이메일'],
              ['등급', tierLabels[user.tier] || user.tier],
              ['가입일', new Date(user.createdAt).toLocaleDateString('ko-KR')],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-4">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          {user.provider === 'google' && (
            <p className="mt-4 text-sm text-gray-500">
              Google 계정으로 가입하셨습니다. 이메일 및 비밀번호는 변경할 수 없습니다.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8">
            <label className="text-sm font-semibold text-gray-500">이름 (Display Name)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            {success && <p className="mt-2 text-sm text-green-500">{success}</p>}
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </form>

          <div className="mt-6 flex gap-4 border-t border-gray-100 pt-6">
            <Link href="/user/settings" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold">계정 설정</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
