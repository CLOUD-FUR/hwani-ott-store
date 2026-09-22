// 관리자 상품 등록/수정 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ProductOption {
  name: string;
  price: number;
}

export default function AdminProductFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEdit = !!params?.id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    image: '',
    isAvailable: true,
  });
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [newOption, setNewOption] = useState({ name: '', price: 0 });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchProduct();
    }
  }, []);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/products/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.data.name,
          description: data.data.description,
          price: data.data.price,
          image: data.data.image || '',
          isAvailable: data.data.isAvailable,
        });
        setOptions(data.data.options || []);
      }
    } catch (error) {
      console.error('Product fetch error:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, image: data.url }));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddOption = () => {
    if (!newOption.name) {
      alert('옵션명을 입력하세요.');
      return;
    }

    setOptions([...options, newOption]);
    setNewOption({ name: '', price: 0 });
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      alert('모든 필수 항목을 입력하세요.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken');
      const url = isEdit ? `/api/admin/products/${params.id}` : '/api/admin/products';

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          options: options.length > 0 ? options : undefined,
        }),
      });

      if (res.ok) {
        alert(isEdit ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
        router.push('/admin/products');
      } else {
        const data = await res.json();
        alert(data.error || '상품 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Product save error:', error);
      alert('상품 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-width p-6">
        <h1 className="text-3xl font-bold mb-8">
          {isEdit ? '상품 수정' : '새 상품 등록'}
        </h1>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
            {/* 상품 이미지 */}
            <div>
              <label className="block text-sm font-medium mb-2">상품 이미지</label>

              {formData.image && (
                <div className="mb-4 aspect-video bg-slate-800 rounded-lg overflow-hidden">
                  <img
                    src={formData.image}
                    alt="상품 이미지"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-sky-500 file:text-white file:cursor-pointer hover:file:bg-sky-600"
              />
              {uploading && (
                <p className="text-sm text-slate-400 mt-2">업로드 중...</p>
              )}
            </div>

            {/* 상품명 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                상품명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="예: Netflix 프리미엄 1개월"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 상품 설명 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                상품 설명 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={6}
                placeholder="상품에 대한 상세 설명을 입력하세요."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* 가격 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                기본 가격 (원) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                required
                min="0"
                placeholder="10000"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 옵션 */}
            <div>
              <label className="block text-sm font-medium mb-2">상품 옵션 (선택)</label>

              {options.length > 0 && (
                <div className="space-y-2 mb-4">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{option.name}</span>
                        <span className="text-slate-400 ml-2">
                          {option.price > 0 ? `+${option.price.toLocaleString()}원` : '동일 가격'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm transition"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption.name}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                  placeholder="옵션명 (예: 1개월)"
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
                <input
                  type="number"
                  value={newOption.price}
                  onChange={(e) => setNewOption({ ...newOption, price: parseInt(e.target.value) })}
                  placeholder="추가 금액"
                  className="w-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-lg transition whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 판매 상태 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-4 h-4 text-sky-500 bg-slate-800 border-slate-700 rounded focus:ring-sky-500"
              />
              <label htmlFor="isAvailable" className="ml-2 text-sm">
                판매 중
              </label>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {loading ? '저장 중...' : isEdit ? '수정 완료' : '등록 완료'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
