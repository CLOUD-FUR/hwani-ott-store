'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.replace('/admin/dashboard');
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <Image src="/OTT.png" alt="화니 OTT" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" priority />
            <span className="text-2xl font-bold text-white">화니 OTT</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2 mt-6">관리자 로그인</h1>
          <p className="text-slate-400">관리자 계정으로 로그인하세요</p>
        </div>

        <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-8">
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-white font-medium mb-2">
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full px-4 py-3 bg-[#0F172A] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8] transition-colors"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-white font-medium mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full px-4 py-3 bg-[#0F172A] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8] transition-colors"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-[#0F172A]/50 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400 text-center">
              관리자 계정은 하드코딩된 아이디와 비밀번호로만 접근 가능합니다
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-slate-500 hover:text-slate-400 text-sm">
            ← 일반 로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
