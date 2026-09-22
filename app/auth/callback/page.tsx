'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');

    if (error) {
      alert(error);
      router.replace('/auth/login');
    } else {
      // Session cookie is already set by the server
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      <p className="text-gray-600">로그인 처리 중...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <Suspense fallback={
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="text-gray-600">로그인 처리 중...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </main>
  );
}
