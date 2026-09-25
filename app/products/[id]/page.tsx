'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header, { CartProvider, useCart } from '@/app/components/Header';

interface Product {
  id: string;
  name: string;
  description: string;
  salePrice: number;
  images: string[];
  price?: number;
  image?: string | null;
  isVisible?: boolean;
  isAvailable?: boolean;
  options?: { id: string; name: string; price: number }[];
}

function ProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const params = useParams();
  const { refreshCartCount } = useCart();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (product?.options && product.options.length > 0) {
      setSelectedOption(product.options[0].id);
    }
  }, [product]);

  const getTotalPrice = () => {
    if (!product) return 0;
    let basePrice = product.salePrice ?? product.price ?? 0;
    if (selectedOption && product.options) {
      const option = product.options.find(o => o.id === selectedOption);
      if (option) basePrice += option.price;
    }
    return basePrice * quantity;
  };

  const handleAddToCart = async () => {
    if (!product || isSubmitting) return;
    const option = product.options?.find((item) => item.id === selectedOption);
    setIsSubmitting(true);
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, optionId: option?.id || null, quantity }),
    });
    if (response.status === 401) {
      router.push(`/auth/login?redirect=/products/${product.id}`);
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || '장바구니에 담지 못했습니다.');
      setIsSubmitting(false);
      return;
    }
    // Success: refresh cart count via context, show success feedback, do NOT redirect
    refreshCartCount();
    setAddedToCart(true);
    setIsSubmitting(false);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handlePurchase = () => {
    if (!product || isSubmitting) return;
    const option = product.options?.find((item) => item.id === selectedOption);
    sessionStorage.setItem('checkoutDirect', JSON.stringify({
      productId: product.id,
      optionId: option?.id || null,
      quantity,
    }));
    router.push('/checkout');
  };

  return (
    <>
      {/* Product Detail */}
      <section className="py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            상품 목록으로
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)] lg:gap-12">
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
              {!(product.isVisible ?? product.isAvailable) && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg">
                    품절
                  </span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">{product.name}</h1>
              <p className="text-slate-600 text-lg mb-8 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>

              {/* Options */}
              {product.options && product.options.length > 0 && (
                <div className="mb-6">
                  <label className="block text-slate-900 font-medium mb-3">옵션 선택</label>
                  <div className="grid grid-cols-1 gap-2">
                    {product.options.map((option) => (
                      <button
                        key={option.name}
                        onClick={() => setSelectedOption(option.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedOption === option.id
                            ? 'border-[#38BDF8] bg-[#38BDF8]/10'
                            : 'border-slate-700 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-slate-900 font-medium">{option.name}</span>
                          <span className="text-slate-500">
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
                <label className="block text-slate-900 font-medium mb-3">수량</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-slate-900 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">총 가격</span>
                  <span className="text-3xl font-bold text-slate-900">
                    {getTotalPrice().toLocaleString()}
                    <span className="text-lg text-slate-500 font-normal ml-1">원</span>
                  </span>
                </div>
              </div>

              {/* 구매하기 (Buy Now) */}
              <button
                onClick={handlePurchase}
                disabled={!(product.isVisible ?? product.isAvailable) || isSubmitting}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all mb-3 ${
                  (product.isVisible ?? product.isAvailable) && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-[#F97316]/20'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '처리 중...' : !(product.isVisible ?? product.isAvailable) ? '품절' : '구매하기'}
              </button>

              {/* 장바구치 담기 (Add to Cart) */}
              <button
                onClick={handleAddToCart}
                disabled={!(product.isVisible ?? product.isAvailable) || isSubmitting || addedToCart}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  (product.isVisible ?? product.isAvailable) && !isSubmitting && !addedToCart
                    ? 'bg-gray-800 hover:bg-gray-900'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '담는 중...' : addedToCart ? '✓ 담겼습니다' : !(product.isVisible ?? product.isAvailable) ? '품절' : '장바구니 담기'}
              </button>

              {/* Info */}
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-slate-900 font-semibold mb-4">구매 안내</h3>
                <ul className="space-y-2 text-sm text-slate-500">
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
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              © 2026 화니 OTT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(res => res.json())
      .then(data => {
        const loaded = data.product || data.data;
        setProduct(loaded);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#38BDF8]"></div>
      </div>
    );
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
        <Header />

        {!product ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">상품을 찾을 수 없습니다</h1>
            <Link href="/products" className="text-[#38BDF8] hover:text-[#0EA5E9]">
              상품 목록으로 돌아가기
            </Link>
          </div>
        ) : (
          <ProductDetailContent product={product} />
        )}
      </div>
    </CartProvider>
  );
}
