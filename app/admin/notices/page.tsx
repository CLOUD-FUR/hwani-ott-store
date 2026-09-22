// 관리자 공지사항 관리 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notice {
  id: string;
  title: string;
  content: string;
  link: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function AdminNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link: '',
    isActive: true,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/admin/notices', {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setNotices(data.data);
    } catch (error) {
      console.error('Notices fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingNotice
        ? `/api/admin/notices/${editingNotice.id}`
        : '/api/admin/notices';

      const res = await fetch(url, {
        method: editingNotice ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingNotice ? '공지사항이 수정되었습니다.' : '공지사항이 생성되었습니다.');
        setShowModal(false);
        setEditingNotice(null);
        setFormData({
          title: '',
          content: '',
          link: '',
          isActive: true,
          startDate: '',
          endDate: '',
        });
        fetchNotices();
      }
    } catch (error) {
      console.error('Notice save error:', error);
      alert('공지사항 저장 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      link: notice.link || '',
      isActive: notice.isActive,
      startDate: notice.startDate ? notice.startDate.split('T')[0] : '',
      endDate: notice.endDate ? notice.endDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (res.ok) {
        alert('공지사항이 삭제되었습니다.');
        fetchNotices();
      }
    } catch (error) {
      console.error('Notice delete error:', error);
      alert('공지사항 삭제 중 오류가 발생했습니다.');
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
          <h1 className="text-3xl font-bold">공지사항 관리</h1>
          <button
            onClick={() => {
              setEditingNotice(null);
              setFormData({
                title: '',
                content: '',
                link: '',
                isActive: true,
                startDate: '',
                endDate: '',
              });
              setShowModal(true);
            }}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-lg font-medium transition"
          >
            + 새 공지 추가
          </button>
        </div>

        {notices.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400 mb-4">공지사항이 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-lg font-medium transition"
            >
              첫 공지 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{notice.title}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          notice.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {notice.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{notice.content}</p>
                    {notice.link && (
                      <a
                        href={notice.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 text-sm hover:underline"
                      >
                        {notice.link}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(notice)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded transition text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-slate-500">
                  {notice.startDate && (
                    <span>시작: {new Date(notice.startDate).toLocaleDateString('ko-KR')}</span>
                  )}
                  {notice.endDate && (
                    <span>종료: {new Date(notice.endDate).toLocaleDateString('ko-KR')}</span>
                  )}
                  <span>생성: {new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 공지 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">
              {editingNotice ? '공지사항 수정' : '새 공지사항'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">내용</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">링크 (선택)</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">시작일 (선택)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">종료일 (선택)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-sky-500 bg-slate-800 border-slate-700 rounded focus:ring-sky-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm">
                  공지 활성화
                </label>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-sky-500 hover:bg-sky-600 rounded-lg transition"
                >
                  {editingNotice ? '수정' : '생성'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingNotice(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
