'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, Filter, PackageOpen, Search, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  originalPrice: number;
  salePrice: number;
  isVisible?: boolean;
  category?: string | null;
  keywords?: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recommended');
  const [selectedCategory, setSelectedCategory] = useState<string | ''>('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (search) params.set('q', search);
    const qs = params.toString();

    setLoading(true);
    fetch(`/api/products${qs ? `?${qs}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, search]);

  const filteredProducts = products
    .sort((a, b) => {
      if (sort === 'low') return a.salePrice - b.salePrice;
      if (sort === 'high') return b.salePrice - a.salePrice;
      return 0;
    });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/OTT.png" alt="화니 OTT" width={42} height={42} className="h-10 w-10 rounded-xl object-contain" priority />
            <span className="text-xl font-bold tracking-tight text-gray-900">화니 OTT</span>
          </Link>
          <nav className="flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/products" className="text-blue-600">상품</Link>
            <Link href="/auth/login" className="transition hover:text-blue-600">로그인</Link>
            <Link href="/auth/login" className="rounded-xl bg-gray-900 px-5 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600 whitespace-nowrap shrink-0 min-h-[44px]">시작하기</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-violet-50/70 px-6 pb-16 pt-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm ring-1 ring-blue-100">
                <Sparkles className="h-4 w-4" /> 프리미엄 콘텐츠 스토어
              </div>
              <h1 className="text-5xl font-bold leading-[1.15] tracking-tight text-gray-900 md:text-6xl">원하는 즐거움을<br /><span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">더 가깝게</span></h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">화니오티티의 다양한 상품을 한눈에 보고<br />간편하게 만나보세요.</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Collection</p>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">전체 상품</h2>
              <p className="mt-2 text-gray-500">화니오티티에서 준비한 상품을 만나보세요.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="상품 검색" className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 sm:w-56" />
              </label>
              <label className="relative">
                <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 appearance-none rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                  <option value="recommended">추천순</option>
                  <option value="low">낮은 가격순</option>
                  <option value="high">높은 가격순</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </label>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedCategory === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-[390px] animate-pulse rounded-3xl bg-gray-100" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-24 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-5 text-xl font-bold text-gray-900">상품이 아직 없어요</h3>
              <p className="mt-2 text-gray-500">관리자가 상품을 등록하면 이곳에 표시됩니다.</p>
              <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white whitespace-nowrap">홈으로 돌아가기 <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const discount = product.originalPrice > product.salePrice ? Math.round((1 - product.salePrice / product.originalPrice) * 100) : 0;
                return (
                  <Link key={product.id} href={`/products/${product.id}`} className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_rgb(37,99,235,0.12)]">
                    <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-50 to-violet-50">
                      {product.images?.[0] ? <Image src={product.images[0]} alt={product.name} fill className="object-cover transition duration-700 group-hover:scale-110" /> : <div className="flex h-full items-center justify-center text-gray-300"><PackageOpen className="h-16 w-16" /></div>}
                      {discount > 0 && <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-600 shadow-sm">-{discount}%</span>}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 transition group-hover:text-blue-600">{product.name}</h3>
                      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-gray-500">{product.description}</p>
                      <div className="mt-5 flex items-end justify-between">
                        <div>{product.originalPrice > product.salePrice && <p className="text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString()}원</p>}<p className="text-2xl font-bold text-gray-900">{product.salePrice.toLocaleString()}<span className="ml-1 text-sm font-medium text-gray-500">원</span></p></div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"><ArrowRight className="h-4 w-4" /></span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 px-6 py-12"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-lg font-bold text-gray-900">화니 OTT</p><p className="mt-1 text-sm text-gray-500">더 가깝고 편리한 콘텐츠 라이프</p></div><p className="text-sm text-gray-400">© 2026 화니 OTT. All rights reserved.</p></div></div></footer>
    </div>
  );
}
