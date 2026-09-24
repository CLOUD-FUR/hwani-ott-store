'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { email: string; name: string | null; uniqueId: string; tier: string; provider: string; createdAt: string };

export default function UserSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login?redirect=/user/settings');
        return;
      }
      setUser((await response.json()).data.user as User);
    })();
  }, [router]);

  if (!user) return <main className="min-h-screen bg-gray-50 p-12 text-center">불러오는 중...</main>;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChanging(true);
    setError(null);
    setSuccess(null);
    const response = await fetch('/api/user/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await response.json();
    if (data.success) {
      setSuccess(data.message || '비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(data.error || '오류가 발생했습니다.');
    }
    setChanging(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/user" className="text-sm text-blue-600">← 내 정보</Link>
        <div className="mt-4 rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">계정 설정</h1>

          {user.provider === 'email' && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">비밀번호 변경</h2>
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-500">현재 비밀번호</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-500">{success}</p>}
                <button
                  type="submit"
                  disabled={changing || newPassword !== confirmPassword || !currentPassword || !newPassword}
                  className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {changing ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            </div>
          )}

          {user.provider === 'google' && (
            <p className="mt-8 text-sm text-gray-500">
              Google 계정으로 가입하셨습니다. 비밀번호 변경은 사용할 수 없습니다.
            </p>
          )}

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold">로그아웃</h2>
            <button
              onClick={handleLogout}
              className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900"
            >
              로그아웃
            </button>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-red-600">회원 탈퇴</h2>
            <p className="mt-2 text-sm text-gray-500">
              계정을 삭제하려면 관리자에게 문의하시기 바랍니다.
            </p>
            <button
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-xl bg-gray-300 px-4 py-3 font-semibold text-gray-500"
            >
              관리자 문의 (준비 중)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
