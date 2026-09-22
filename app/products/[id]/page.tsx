'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  salePrice: number;
  images: string[];
  price?: number;
  image?: string | null;
  isAvailable: boolean;
  options?: { id: string; name: string; price: number }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(res => res.json())
      .then(data => {
        const loaded = data.product || data.data;
        setProduct(loaded);
        if (loaded?.options && loaded.options.length > 0) {
          setSelectedOption(loaded.options[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const getTotalPrice = () => {
    if (!product) return 0;
    let basePrice = product.salePrice ?? product.price ?? 0;
    if (selectedOption && product.options) {
      const option = product.options.find(o => o.id === selectedOption);
      if (option) basePrice += option.price;
    }
    return basePrice * quantity;
  };

  const handlePurchase = async () => {
    if (!product) return;
    const option = product.options?.find((item) => item.id === selectedOption);
    const response = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, optionId: option?.id || null, quantity }) });
    if (response.status === 401) { router.push(`/auth/login?redirect=/products/${product.id}`); return; }
    if (!response.ok) { const data = await response.json().catch(() => ({})); alert(data.error || '장바구니에 담지 못했습니다.'); return; }
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#38BDF8]"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <header className="border-b border-slate-800/50 bg-[#0B0E14]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/OTT.png" alt="화니 OTT" width={42} height={42} className="h-10 w-10 rounded-xl object-contain" priority />
                <span className="text-xl font-bold text-gray-900">화니 OTT</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">상품을 찾을 수 없습니다</h1>
          <Link href="/products" className="text-[#38BDF8] hover:text-[#0EA5E9]">
            상품 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-[#0B0E14]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/OTT.png" alt="화니 OTT" width={42} height={42} className="h-10 w-10 rounded-xl object-contain" priority />
              <span className="text-xl font-bold text-white">화니 OTT</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/products" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                상품
              </Link>
              <Link href="/auth/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                로그인
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Product Detail */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            상품 목록으로
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden">
              {(product.images?.[0] || product.image) ? (
                <Image
                  src={product.images?.[0] || product.image || ''}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg">
                    품절
                  </span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold text-white mb-4">{product.name}</h1>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                {product.description}
              </p>

              {/* Options */}
              {product.options && product.options.length > 0 && (
                <div className="mb-6">
                  <label className="block text-white font-medium mb-3">옵션 선택</label>
                  <div className="grid grid-cols-1 gap-2">
                    {product.options.map((option) => (
                      <button
                        key={option.name}
                        onClick={() => setSelectedOption(option.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedOption === option.name
                            ? 'border-[#38BDF8] bg-[#38BDF8]/10'
                            : 'border-slate-700 bg-[#1E293B] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">{option.name}</span>
                          <span className="text-slate-400">
                            {option.price > 0 ? `+${option.price.toLocaleString()}원` : '기본'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-8">
                <label className="block text-white font-medium mb-3">수량</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-[#1E293B] border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-white font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-[#1E293B] border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="mb-8 p-6 bg-[#1E293B] rounded-xl border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">총 가격</span>
                  <span className="text-3xl font-bold text-white">
                    {getTotalPrice().toLocaleString()}
                    <span className="text-lg text-slate-400 font-normal ml-1">원</span>
                  </span>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={!product.isAvailable}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  product.isAvailable
                    ? 'bg-[#F97316] hover:bg-[#EA580C] hover:shadow-lg hover:shadow-[#F97316]/20'
                    : 'bg-slate-700 cursor-not-allowed'
                }`}
              >
                {product.isAvailable ? '구매하기' : '품절'}
              </button>

              {/* Info */}
              <div className="mt-8 p-6 bg-[#1E293B]/50 rounded-xl border border-slate-800">
                <h3 className="text-white font-semibold mb-4">구매 안내</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    결제 완료 즉시 이메일로 계정 정보가 전송됩니다
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    마이페이지에서 구매 내역을 확인할 수 있습니다
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    문의사항은 고객센터를 이용해주세요
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0B0E14] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              © 2026 화니 OTT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
