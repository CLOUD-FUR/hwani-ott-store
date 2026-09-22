'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const [code, setCode] = useState('');
  const [email, setEmail] = useState(emailParam || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('이메일 인증이 완료되었습니다. 로그인 페이지로 이동합니다.');
        router.push('/auth/login');
      } else {
        setError(data.error || '인증에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/OTT.png" alt="화니 OTT" width={42} height={42} className="h-10 w-10 rounded-xl object-contain" priority />
              <span className="text-xl font-bold text-gray-900">화니 OTT</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">이메일 인증</h1>
            <p className="text-gray-500">이메일로 전송된 6자리 인증 코드를 입력하세요</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl shadow-gray-200/50">
            <form onSubmit={handleVerify}>
              <div className="mb-4">
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

              <div className="mb-6">
                <label htmlFor="code" className="block text-gray-800 font-medium mb-2">
                  인증 코드
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6자리 숫자"
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors text-center text-2xl tracking-widest font-mono"
                />
                <p className="mt-2 text-sm text-gray-500">
                  인증 코드는 10분간 유효합니다.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-3 bg-[#38BDF8] hover:bg-[#0EA5E9] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '인증 중...' : '인증하기'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                이메일을 받지 못하셨나요?{' '}
                <button
                  onClick={() => window.location.reload()}
                  className="text-[#38BDF8] hover:text-[#0EA5E9] font-medium"
                >
                  다시 시도
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 화니 OTT. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
