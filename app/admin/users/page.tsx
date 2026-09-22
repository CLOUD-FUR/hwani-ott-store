// 관리자 사용자 관리 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  uniqueId: string;
  tier: string;
  provider: string;
  isVerified: boolean;
  isBlacklisted: boolean;
  createdAt: string;
  _count: {
    orders: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newTier, setNewTier] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [tierFilter]);

  const fetchUsers = async () => {
    try {
      let url = '/api/admin/users';
      const params = new URLSearchParams();

      if (tierFilter !== 'all') {
        params.append('tier', tierFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setUsers(data.data.users);
    } catch (error) {
      console.error('Users fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const handleTierChange = async (userId: string, tier: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      if (res.ok) {
        alert('등급이 변경되었습니다.');
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Tier change error:', error);
      alert('등급 변경 중 오류가 발생했습니다.');
    }
  };

  const handleBlacklistToggle = async (userId: string, isBlacklisted: boolean) => {
    if (!confirm(`이 사용자를 ${isBlacklisted ? '차단 해제' : '차단'}하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isBlacklisted: !isBlacklisted }),
      });

      if (res.ok) {
        alert(isBlacklisted ? '차단이 해제되었습니다.' : '사용자가 차단되었습니다.');
        fetchUsers();
      }
    } catch (error) {
      console.error('Blacklist toggle error:', error);
      alert('차단 처리 중 오류가 발생했습니다.');
    }
  };

  const tierNames: Record<string, string> = {
    USER: '일반',
    SILVER: '실버',
    GOLD: '골드',
    PLATINUM: '플래티넘',
    DIAMOND: '다이아몬드',
  };

  const tierColors: Record<string, string> = {
    USER: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    SILVER: 'text-slate-300 bg-slate-400/10 border-slate-400/20',
    GOLD: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    PLATINUM: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    DIAMOND: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
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
        <h1 className="text-3xl font-bold mb-8">사용자 관리</h1>

        {/* 검색 및 필터 */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="이메일, 이름, 고유번호로 검색"
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition"
            >
              검색
            </button>
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-sky-500"
          >
            <option value="all">전체 등급</option>
            <option value="USER">일반</option>
            <option value="SILVER">실버</option>
            <option value="GOLD">골드</option>
            <option value="PLATINUM">플래티넘</option>
            <option value="DIAMOND">다이아몬드</option>
          </select>
        </div>

        {users.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400">사용자가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">고유번호</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">이메일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">등급</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">가입방식</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">주문수</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">가입일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className={user.isBlacklisted ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-mono text-sm text-sky-400">
                      {user.uniqueId}
                    </td>
                    <td className="px-4 py-3">
                      {user.name}
                      {user.isBlacklisted && (
                        <span className="ml-2 text-xs text-red-400">(차단됨)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs border ${tierColors[user.tier]}`}>
                        {tierNames[user.tier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.provider === 'email' ? '이메일' : 'Google'}
                    </td>
                    <td className="px-4 py-3 text-sm">{user._count.orders}건</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewTier(user.tier);
                          }}
                          className="px-3 py-1 bg-sky-500 hover:bg-sky-600 rounded text-sm transition"
                        >
                          등급
                        </button>
                        <button
                          onClick={() => handleBlacklistToggle(user.id, user.isBlacklisted)}
                          className={`px-3 py-1 rounded text-sm transition ${
                            user.isBlacklisted
                              ? 'bg-emerald-500 hover:bg-emerald-600'
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                        >
                          {user.isBlacklisted ? '해제' : '차단'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 등급 변경 모달 */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">등급 변경</h3>
            <p className="text-slate-400 mb-4">
              사용자: <span className="text-white">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            <label className="block text-sm font-medium mb-2">새 등급</label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 mb-6"
            >
              <option value="USER">일반</option>
              <option value="SILVER">실버</option>
              <option value="GOLD">골드</option>
              <option value="PLATINUM">플래티넘</option>
              <option value="DIAMOND">다이아몬드</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => handleTierChange(selectedUser.id, newTier)}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition"
              >
                변경
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
