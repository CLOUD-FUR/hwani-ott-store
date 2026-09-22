// 관리자 상품 관리 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
  createdAt: string;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products', {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setProducts(data.data);
    } catch (error) {
      console.error('Products fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (res.ok) {
        alert('상품이 삭제되었습니다.');
        fetchProducts();
      }
    } catch (error) {
      console.error('Product delete error:', error);
      alert('상품 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Product toggle error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-width p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">상품 관리</h1>
          <button
            onClick={() => router.push('/admin/products/new')}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-lg font-medium transition"
          >
            + 새 상품 추가
          </button>
        </div>

        {products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400 mb-4">등록된 상품이 없습니다.</p>
            <button
              onClick={() => router.push('/admin/products/new')}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-lg font-medium transition"
            >
              첫 상품 추가하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition"
              >
                <div className="aspect-video bg-slate-800 relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      이미지 없음
                    </div>
                  )}
                  {!product.isAvailable && (
                    <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-sm rounded">
                      품절
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="text-xl font-bold text-sky-400 mb-4">
                    {product.price.toLocaleString()}원
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                      className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded transition text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                      className={`flex-1 px-4 py-2 rounded transition text-sm ${
                        product.isAvailable
                          ? 'bg-orange-500 hover:bg-orange-600'
                          : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      {product.isAvailable ? '품절 처리' : '판매 재개'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
