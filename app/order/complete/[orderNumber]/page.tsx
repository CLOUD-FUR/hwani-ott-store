'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

type Product = { name: string; images: string[]; salePrice: number };
type Option = { id: string; name: string; price: number } | null;

type Order = {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  totalAmount: number;
  depositorName: string;
  userEmail: string;
  accountInfo: { bankName?: string | null; bankAccount?: string | null; accountHolder?: string | null } | null;
  createdAt: string;
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    product: Product;
    option: Option;
  }>;
};

type Settings = {
  kakaotalkUrl?: string | null;
  channelTalkUrl?: string | null;
};

const statusConfig: Record<Order['status'], { circle: string; label: string; bg: string; text: string }> = {
  PENDING: { circle: 'bg-amber-400', label: '입금 대기', bg: 'bg-amber-50', text: 'text-amber-700' },
  APPROVED: { circle: 'bg-emerald-500', label: '입금 확인', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  COMPLETED: { circle: 'bg-blue-500', label: '거래 완료', bg: 'bg-blue-50', text: 'text-blue-700' },
  REJECTED: { circle: 'bg-red-500', label: '거절됨', bg: 'bg-red-50', text: 'text-red-700' },
  CANCELLED: { circle: 'bg-gray-400', label: '취소됨', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const isTerminal = (status: Order['status']) =>
  status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED';

// Reusable copy button with "복사 완료" feedback (Req 8)
function CopyButton({ value, ariaLabel = '복사' }: { value: string; ariaLabel?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard may be unavailable — still show feedback */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? '복사 완료' : '복사'}</span>
    </button>
  );
}

export default function OrderCompletePage() {
  const router = useRouter();
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params?.orderNumber;

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = async () => {
    if (!orderNumber) return;
    try {
      const res = await fetch(`/api/orders/by-number/${orderNumber}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.push(`/auth/login?redirect=/order/complete/${orderNumber}`);
        return;
      }
      if (res.status === 403) {
        setError('이 주문에 대한 접근 권한이 없습니다.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError((await res.json()).error || '주문 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setOrder(data.data);
      setError('');
    } catch (err) {
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const [orderRes, settingsRes] = await Promise.all([
        fetch(`/api/orders/by-number/${orderNumber}`, { cache: 'no-store' }).then((r) => {
          if (r.status === 401) {
            router.push(`/auth/login?redirect=/order/complete/${orderNumber}`);
            return null;
          }
          return r;
        }),
        fetch('/api/settings', { cache: 'no-store' }).then((r) => r.json()),
      ]);

      if (orderRes === null) return; // auth redirect in progress

      if (orderRes && orderRes.ok) {
        const data = await orderRes.json();
        setOrder(data.data);
        if (settingsRes?.success && settingsRes.data) setSettings(settingsRes.data);
      } else if (orderRes) {
        if (orderRes.status === 403) setError('이 주문에 대한 접근 권한이 없습니다.');
        else setError((await orderRes.json()).error || '주문 정보를 찾을 수 없습니다.');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  // Real-time feel: re-fetch status while order is still in a non-terminal state.
  useEffect(() => {
    if (!order || isTerminal(order.status)) return;
    const interval = setInterval(() => {
      void loadOrder();
    }, 15000);
    return () => clearInterval(interval);
  }, [order]);

  const status = order ? statusConfig[order.status] : null;

  // ---------- Loading / error / not-found states ----------
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 pb-[120px]">
        <div className="mx-auto max-w-xl px-6 py-12 text-center">
          <p className="text-gray-500">주문 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 pb-[120px]">
        <div className="mx-auto max-w-xl px-6 py-12">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-center text-red-600">{error || '주문을 찾을 수 없습니다.'}</p>
            <div className="mt-6 flex gap-3">
              <Link href="/orders" className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white">
                내 주문 보기
              </Link>
              <Link href="/products" className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-center font-semibold">
                상품 보기
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const ai = order.accountInfo;
  const bankLabel = ai?.bankName || '미설정';
  const accountNumber = ai?.bankAccount || '미설정';
  const accountHolder = ai?.accountHolder || order.depositorName;
  // Req 1: account info displayed as "은행명 + 계좌번호" (e.g. "국민은행 000000")
  const accountDisplay = `${bankLabel} ${accountNumber}`;

  const kakaotalkUrl = settings.kakaotalkUrl;

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 pb-[120px]">
      <div className="mx-auto max-w-xl px-6 py-12">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold text-blue-600">주문 접수 완료</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">입금 후 주문이 승인됩니다</h1>
          <p className="mt-2 text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Req 4: order status with colored circle indicator */}
        {status && (
          <div
            className={`mt-6 flex items-center justify-center gap-3 rounded-2xl ${status.bg} px-5 py-4 shadow-sm`}
          >
            <span className={`h-3 w-3 shrink-0 rounded-full ${status.circle}`} />
            <span className={`text-sm font-semibold ${status.text}`}>{status.label}</span>
          </div>
        )}

        {/* Req 1: purchased product info */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">구매한 상품</h2>
          <div className="mt-4 space-y-4">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {item.product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                      이미지 없음
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.product.name}</p>
                  {item.option && <p className="text-sm text-gray-500">{item.option.name}</p>}
                  <p className="text-xs text-gray-400">
                    {item.quantity}개 · {(item.price * item.quantity).toLocaleString()}원
                  </p>
                </div>
                <div className="text-right text-sm font-semibold text-gray-900">
                  {(item.price * item.quantity).toLocaleString()}원
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3 text-right text-xl font-bold text-gray-900">
            총 결제 금액: {order.totalAmount.toLocaleString()}원
          </div>
        </div>

        {/* Req 1: SINGLE consolidated guidance area */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-center text-sm font-semibold text-gray-500">
            입금 완료 후 아래 정보로 주문을 승인합니다
          </h2>

          {/* Account info — "은행명 + 계좌번호" format */}
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              입금 계좌
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-mono text-lg font-bold text-gray-900">{accountDisplay}</p>
              <CopyButton value={accountDisplay} ariaLabel="계좌信息 복사" />
            </div>
            <p className="mt-1 font-mono text-sm text-gray-600">예금주 {accountHolder}</p>
            <p className="mt-2 text-sm text-gray-600">
              입금 금액:
              <span className="font-bold text-gray-900"> {order.totalAmount.toLocaleString()}원</span>
            </p>
          </div>

          {/* Order number */}
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-blue-50/40 px-4 py-3">
            <p className="text-sm text-gray-600">
              주문번호
              <span className="ml-2 font-mono font-bold text-blue-700">{order.orderNumber}</span>
            </p>
            <CopyButton value={order.orderNumber} ariaLabel="주문번호 복사" />
          </div>

          {/* Consolidated message: depositor warning + pickup + kakao inquiry */}
          <div className="mt-4 space-y-2.5 text-sm leading-6 text-gray-600">
            <p>
              <span className="font-semibold text-amber-700">⚠️ 입금자명</span>은 주문 시 입력한
              이름(
              <span className="font-mono">{order.depositorName}</span>)과
              실제 계좌 예금주(
              <span className="font-mono">{accountHolder}</span>)가 일치해야 합니다.
              불일치 시 주문 승인이 지연될 수 있습니다.
            </p>
            <p>
              입금이 완료되면 아래 카카오톡 버튼을 통해
              <span className="font-mono"> {order.orderNumber} </span>
              을(를) 보내주시면 관리자가 입금을 확인하고 제품 수령이 가능합니다.
            </p>
            {kakaotalkUrl ? (
              <p>
                카카오톡 채널톡으로 문의하려면 오른쪽 하단의
                <span className="font-semibold"> 카카오톡 </span>
                버튼을 누르세요. (혹은 채널톡 링크로 직접 문의하실 수도 있습니다.)
              </p>
            ) : (
              <p>입금 후 문의 버튼을 통해 주문번호를 보내주시면 제품 수령이 진행됩니다.</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex gap-3">
          <Link
            href="/orders"
            className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-center font-semibold text-white"
          >
            주문 확인
          </Link>
          <Link
            href="/products"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-center font-semibold"
          >
            상품 보기
          </Link>
        </div>
      </div>

      {/* Req 2: large, prominent floating KakaoTalk button — bottom-right */}
      {kakaotalkUrl && (
        <a
          href={kakaotalkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#FEE500] px-4 py-3 shadow-lg shadow-black/25 ring-2 ring-white transition hover:opacity-90"
          aria-label="카카오톡으로 문의하기"
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#3C1E1E"
              aria-hidden="true"
            >
              <path d="M12 3C7.03 3 3 6.41 3 11c0 3.79 2.7 7.03 5.91 8.46-.1.7-.52 1.47-.9 2.37.15.81 1.08 1.25 1.75.91 1.64-1.01 2.9-2.36 3.79-3.97C20.05 17.95 21 16.54 21 15c0-3.31-2.24-6.16-5.33-6.85C15.46 4.98 14.25 3 12 3z" />
            </svg>
          </span>
          <span className="font-bold text-[#3C1E1E]">카카오톡</span>
        </a>
      )}

    </main>
  );
}
