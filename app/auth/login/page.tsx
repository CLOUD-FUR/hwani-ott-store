'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('로그인 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.');
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-[#0B0E14]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-white">화니 OTT</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">로그인</h1>
            <p className="text-gray-500">화니 OTT에 오신 것을 환영합니다</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl shadow-gray-200/50">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-medium transition-colors mb-6 border border-gray-300 shadow-sm"
            >
              <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden="true">
                <span className="absolute h-5 w-5 rounded-full border-[3px] border-[#4285F4] border-r-[#EA4335] border-b-[#FBBC05]" />
                <span className="absolute right-[-1px] top-[1px] h-[7px] w-[9px] bg-white" />
                <span className="absolute right-[-1px] top-[8px] h-[3px] w-[9px] bg-[#4285F4]" />
              </span>
              <span>Google로 계속하기</span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">또는</span>
              </div>
            </div>

            {/* Email Login */}
            <form onSubmit={handleEmailLogin}>
              <div className="mb-6">
                <label htmlFor="email" className="block text-gray-800 font-medium mb-2">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
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
                className="w-full px-4 py-3 bg-[#38BDF8] hover:bg-[#0EA5E9] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '처리 중...' : '이메일로 로그인'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              계정이 없으신가요?{' '}
              <Link href="/auth/signup" className="text-[#38BDF8] hover:text-[#0EA5E9] font-medium">
                회원가입
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/admin/login" className="text-gray-500 hover:text-blue-600 text-sm">
              관리자 로그인
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0B0E14] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 화니 OTT. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
