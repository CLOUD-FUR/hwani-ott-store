'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  email: string;
  name: string | null;
  uniqueId: string;
  tier: string;
  provider: string;
  createdAt: string;
};

type OrderItem = {
  product: { name: string };
  option: { name: string } | null;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  depositorName: string;
  userEmail: string;
  createdAt: string;
  orderItems: OrderItem[];
};

const statusLabels: Record<string, string> = {
  PENDING: '입금 대기',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
  CANCELLED: '취소됨',
  COMPLETED: '거래 완료',
};

const statusBadgeColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-50 text-yellow-700';
    case 'APPROVED':
      return 'bg-blue-50 text-blue-700';
    case 'REJECTED':
      return 'bg-red-50 text-red-700';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700';
    default:
      return 'bg-gray-100 text-gray-500';
  }
};

function formatOrderItems(orderItems: OrderItem[]): string {
  return orderItems
    .map((item) =>
      `${item.product.name}${item.option ? ` (${item.option.name})` : ''} × ${item.quantity}`
    )
    .join(', ');
}

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login?redirect=/user');
        return;
      }
      setUser((await response.json()).data.user);

      const ordersResponse = await fetch('/api/orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
      }
      setLoading(false);
    })();
  }, [router]);

  const totalUsage = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const purchaseHistory = orders.filter((o) => o.status !== 'PENDING');

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setLogoutLoading(false);
  };

  const handleWithdraw = async () => {
    if (
      !confirm(
        '정말로 탈퇴하시겠습니까?\n\n탈퇴한 계정은 복구할 수 없습니다.\n입력하신 모든 정보와 주문 내역이 영구적으로 삭제됩니다.'
      )
    ) {
      return;
    }
    setWithdrawLoading(true);
    try {
      const response = await fetch('/api/user/withdraw', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert(data.message || '회원 탈퇴가 완료되었습니다.');
        router.push('/');
      } else {
        alert(data.error || '회원 탈퇴 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('회원 탈퇴 중 오류가 발생했습니다.');
    }
    setWithdrawLoading(false);
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-gray-50 p-12 text-center">
        불러오는 중...
      </main>
    );
  }

  const userInfoRows: Array<[string, string]> = [
    ['이름', user.name || '미입력'],
    ['이메일', user.email],
    ['회원 고유번호', user.uniqueId],
    ['등급', user.tier],
    ['가입 방식', user.provider === 'google' ? 'Google' : '이메일'],
    ['가입일', new Date(user.createdAt).toLocaleDateString('ko-KR')],
  ];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-blue-600">
          ← 홈
        </Link>

        {/* 사용자 정보 카드 */}
        <div className="mt-4 rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">내 정보</h1>

          <dl className="mt-8 divide-y divide-gray-100">
            {userInfoRows.map(([label, value]) => (
              <div key={label} className="flex justify-between py-4">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex gap-3">
            <Link
              href="/user/profile"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold"
            >
              회원 정보 수정
            </Link>
            <Link
              href="/user/settings"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold"
            >
              계정 설정
            </Link>
          </div>

          <Link
            href="/orders"
            className="mt-6 block rounded-xl bg-gray-900 px-4 py-3 text-center font-semibold text-white"
          >
            주문 내역 보기
          </Link>
        </div>

        {/* 총 사용 금액 */}
        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">총 사용 금액</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalUsage.toLocaleString()}원
          </p>
          <p className="mt-1 text-sm text-gray-500">
            완료된 주문의 총합입니다
          </p>
        </div>

        {/* 입금대기 주문 */}
        {pendingOrders.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              입금대기 주문
            </h2>
            <div className="mt-4 space-y-3">
              {pendingOrders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl border border-gray-100 p-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-blue-600">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('ko-KR')}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatOrderItems(order.orderItems)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeColor(order.status)}`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                      <p className="mt-1 font-semibold text-gray-900">
                        {order.totalAmount.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 구매내역 */}
        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">구매내역</h2>
          {purchaseHistory.length > 0 ? (
            <div className="mt-4 space-y-3">
              {purchaseHistory.slice(0, 8).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl border border-gray-100 p-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-blue-600">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('ko-KR')}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatOrderItems(order.orderItems)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeColor(order.status)}`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                      <p className="mt-1 font-semibold text-gray-900">
                        {order.totalAmount.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              아직 구매 내역이 없습니다.
            </p>
          )}
        </div>

        {/* 로그아웃 및 회원 탈퇴 */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900 disabled:opacity-50"
          >
            {logoutLoading ? '로그아웃 중...' : '로그아웃'}
          </button>
          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading}
            className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {withdrawLoading ? '처리 중...' : '회원 탈퇴'}
          </button>
        </div>
      </div>
    </main>
  );
}
