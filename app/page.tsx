'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Play, Star, TrendingUp, Sparkles, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  originalPrice: number;
  salePrice: number;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ id: string; title: string; content: string; image: string | null; link: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/notices').then((res) => res.json()).then((data) => { const candidate = data.notices?.[0]; if (candidate && localStorage.getItem(`notice-hidden-${candidate.id}`) !== new Date().toISOString().slice(0, 10)) setNotice(candidate); }).catch(() => {});
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-in-section').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [products]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20">
      {notice && <div className="fixed inset-x-4 top-20 z-[60] mx-auto max-w-xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 p-5"> <div><p className="text-xs font-semibold text-blue-600">공지사항</p><h2 className="mt-1 text-lg font-bold text-gray-900">{notice.title}</h2>{notice.image && (<img src={notice.image} alt={notice.title} className="mt-3 w-full h-28 object-cover rounded-lg border border-blue-100" />)}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{notice.content}</p>{notice.link?.startsWith('https://') && <a href={notice.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-blue-600">자세히 보기 →</a>}</div><button onClick={() => setNotice(null)} aria-label="공지 닫기" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div><button onClick={() => { localStorage.setItem(`notice-hidden-${notice.id}`, new Date().toISOString().slice(0, 10)); setNotice(null); }} className="w-full border-t border-gray-100 px-5 py-3 text-left text-xs text-gray-500">오늘 하루 보지 않기</button></div>}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/OTT.png" alt="화니 OTT" width={42} height={42} className="h-10 w-10 rounded-xl object-contain" priority />
            <span className="text-xl font-bold tracking-tight text-gray-900">화니 OTT</span>
          </Link>
          <nav className="flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/products" className="transition hover:text-blue-600">상품</Link>
            <Link href="/auth/login" className="transition hover:text-blue-600">로그인</Link>
            <Link href="/auth/login" className="rounded-xl bg-gray-900 px-5 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600">시작하기</Link>
          </nav>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzM4OGJmZCIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-40" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center fade-in-section opacity-0 translate-y-8 transition-all duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">화니오티티에 오신 것을 환영합니다</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
              프리미엄 OTT 서비스
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              최고의 콘텐츠를 합리적인 가격에<br />
              지금 바로 시작하세요
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/products"
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                상품 둘러보기
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/auth/login"
                className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-semibold border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>

        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-700" />
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 fade-in-section opacity-0 translate-y-8 transition-all duration-1000">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              왜 화니오티티일까요?
            </h2>
            <p className="text-lg text-gray-600">
              차별화된 서비스로 최고의 경험을 제공합니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Star className="w-8 h-8" />,
                title: '프리미엄 콘텐츠',
                description: '엄선된 최고 품질의 콘텐츠만을 제공합니다',
                gradient: 'from-yellow-400 to-orange-500',
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: '합리적인 가격',
                description: '부담없는 가격으로 누구나 즐길 수 있습니다',
                gradient: 'from-blue-400 to-purple-500',
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: '간편한 이용',
                description: '복잡한 절차 없이 바로 시작할 수 있습니다',
                gradient: 'from-pink-400 to-red-500',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="fade-in-section opacity-0 translate-y-8 transition-all duration-1000 group"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="relative p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-transparent overflow-hidden group-hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500" />

                  <div className={`inline-flex p-4 bg-gradient-to-br ${feature.gradient} rounded-2xl text-white mb-6 shadow-lg`}>
                    {feature.icon}
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-gray-900">
                    {feature.title}
                  </h3>

                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-50/50 to-purple-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 fade-in-section opacity-0 translate-y-8 transition-all duration-1000">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              인기 상품
            </h2>
            <p className="text-lg text-gray-600">
              지금 가장 핫한 상품들을 만나보세요
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, idx) => (
                <div
                  key={product.id}
                  className="fade-in-section opacity-0 translate-y-8 transition-all duration-1000"
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <Link href={`/products/${product.id}`}>
                    <div className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105">
                      {product.images[0] && (
                        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                      )}

                      <div className="p-6">
                        <h3 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>

                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {product.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {product.originalPrice > product.salePrice && (
                              <span className="text-gray-400 line-through text-sm">
                                {product.originalPrice.toLocaleString()}원
                              </span>
                            )}
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {product.salePrice.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 fade-in-section opacity-0 translate-y-8 transition-all duration-1000">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
                <Sparkles className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                곧 만나요!
              </h3>
              <p className="text-gray-600">
                멋진 상품들을 준비 중입니다
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto fade-in-section opacity-0 translate-y-8 transition-all duration-1000">
          <div className="relative p-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />

            <div className="relative text-center text-white">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                지금 바로 시작하세요
              </h2>
              <p className="text-xl mb-8 opacity-90">
                화니오티티와 함께 특별한 경험을 시작해보세요
              </p>

              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                지금 둘러보기
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .fade-in-section.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }

        .delay-700 {
          animation-delay: 700ms;
        }
      `}</style>
    </div>
  );
}
