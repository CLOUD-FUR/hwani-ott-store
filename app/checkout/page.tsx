'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header, { CartProvider } from '@/app/components/Header';

type Item = { id: string; quantity: number; product: { id: string; name: string; salePrice: number; images: string[] }; option: { id: string; name: string; price: number } | null };
type Settings = { bankName?: string | null; bankAccount?: string | null; accountHolder?: string | null; kakaotalkUrl?: string | null; channelTalkUrl?: string | null };

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [depositor, setDepositor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const ids = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]') as string[];
      const direct = sessionStorage.getItem('checkoutDirect');
      const [cartRes, settingsRes] = await Promise.all([fetch('/api/cart'), fetch('/api/settings')]);
      if (cartRes.status === 401) {
        router.push('/auth/login?redirect=/checkout');
        return;
      }
      const settingData = await settingsRes.json();
      setSettings(settingData.data || {});

      if (direct) {
        const payload = JSON.parse(direct) as { productId: string; optionId: string | null; quantity: number };
        const productRes = await fetch(`/api/products/${payload.productId}`);
        const productData = await productRes.json();
        const product = productData.product || productData.data;
        if (!product) {
          setError('상품을 찾을 수 없습니다.');
          return;
        }
        const option = payload.optionId
          ? product.options?.find((o: { id: string; name: string; price: number }) => o.id === payload.optionId) || null
          : null;
        const syntheticItem: Item = {
          id: `direct-${payload.productId}-${payload.optionId || 'null'}`,
          quantity: payload.quantity,
          product: { id: product.id, name: product.name, salePrice: product.salePrice, images: product.images },
          option: option ? { id: option.id, name: option.name, price: option.price } : null,
        };
        setItems([syntheticItem]);
        return;
      }

      const cart = await cartRes.json();
      setItems((cart.data || []).filter((item: Item) => !ids.length || ids.includes(item.id)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.product.salePrice + (item.option?.price || 0)) * item.quantity, 0),
    [items]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!depositor.trim()) {
      setError('입금자명을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.product.id,
          optionId: item.option?.id || null,
          quantity: item.quantity,
        })),
        depositorName: depositor,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || '주문 생성에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    // Redirect to dedicated order completion page (persist on refresh)
    sessionStorage.removeItem('checkoutItems');
    sessionStorage.removeItem('checkoutDirect');
    router.push(`/order/complete/${data.data.orderNumber}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 px-6 py-12 pb-[110px]">
      <CartProvider>
        <Header />
      </CartProvider>
      <div className="mx-auto max-w-3xl">
        <Link href="/cart" className="text-sm text-blue-600">
          ← 장바구니
        </Link>
        <h1 className="mt-3 text-4xl font-bold text-gray-900">결제하기</h1>

        {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">무통장입금</h2>
            {/* Req 11: changed message */}
            <p className="mt-2 text-sm text-gray-500">
              입금 후 카카오톡 채널톡을 통해 제품 수령이 가능합니다.
            </p>

            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between border-b border-gray-100 pb-3 text-sm">
                  <span>
                    {item.product.name} · {item.option?.name || '기본'} × {item.quantity}
                  </span>
                  <b>{((item.product.salePrice + (item.option?.price || 0)) * item.quantity).toLocaleString()}원</b>
                </div>
              ))}
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              입금자명
              <input
                value={depositor}
                onChange={(event) => setDepositor(event.target.value)}
                required
                maxLength={100}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
                placeholder="입금자명을 입력하세요"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !items.length}
              className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? '주문 접수 중...' : '결제하러 가기'}
            </button>
          </form>

          <aside className="h-fit rounded-3xl bg-gray-900 p-6 text-white">
            <h2 className="font-semibold">입금 계좌</h2>
            <p className="mt-4 text-sm text-gray-300">{settings.bankName || '미설정'}</p>
            <p className="mt-1 text-xl font-bold">{settings.bankAccount || '미설정'}</p>
            <p className="mt-1 text-sm text-gray-300">예금주 {settings.accountHolder || '미설정'}</p>
            <div className="my-5 border-t border-white/10" />
            <p className="text-sm text-gray-400">결제 금액</p>
            <p className="mt-1 text-3xl font-bold">{total.toLocaleString()}원</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
