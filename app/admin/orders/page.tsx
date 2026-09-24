// 관리자 주문 관리 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  orderNumber: string;
  user: {
    name: string;
    email: string;
    uniqueId: string;
  };
  totalAmount: number;
  status: string;
  createdAt: string;
  orderItems: Array<{
    product: { name: string };
    option: { name: string } | null;
    quantity: number;
    price: number;
  }>;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/orders'
        : `/api/admin/orders?status=${statusFilter}`;

      const res = await fetch(url, {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setOrders(data.data.orders);
    } catch (error) {
      console.error('Orders fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          deliveryInfo: deliveryInfo || undefined,
          rejectionReason: rejectionReason || undefined,
        }),
      });

      if (res.ok) {
        alert('주문 상태가 변경되었습니다.');
        setSelectedOrder(null);
        setDeliveryInfo('');
        setRejectionReason('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Status change error:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const statusText: Record<string, string> = {
    PENDING: '입금 대기',
    APPROVED: '승인됨',
    REJECTED: '거절됨',
    COMPLETED: '거래 완료',
    CANCELLED: '취소됨',
  };

  const statusColors: Record<string, string> = {
    PENDING: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    APPROVED: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    REJECTED: 'text-red-400 bg-red-500/10 border-red-500/20',
    COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    CANCELLED: 'text-red-400 bg-red-500/10 border-red-500/20',
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
        <h1 className="text-3xl font-bold mb-8">주문 관리</h1>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status === 'all' ? '전체' : statusText[status]}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400">주문이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-lg font-bold text-sky-400">
                        {order.orderNumber}
                      </span>
                      <span className={`px-3 py-1 rounded text-sm border ${statusColors[order.status]}`}>
                        {statusText[order.status]}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      주문일시: {new Date(order.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">고객정보</div>
                    <div className="font-medium">{order.user.name}</div>
                    <div className="text-sm text-slate-400">{order.user.email}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: {order.user.uniqueId}</div>
                  </div>
                </div>

                {/* 주문 상품 */}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                  {order.orderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2">
                      <div>
                        <span className="font-medium">{item.product.name}</span>
                        {item.option && (
                          <span className="text-sm text-slate-400 ml-2">({item.option.name})</span>
                        )}
                        <span className="text-sm text-slate-400 ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-medium">{item.price.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between text-lg font-bold">
                    <span>총 금액</span>
                    <span className="text-sky-400">{order.totalAmount.toLocaleString()}원</span>
                  </div>
                </div>

                {/* 상태 변경 버튼 */}
                <div className="flex gap-2">
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, 'APPROVED')}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition whitespace-nowrap"
                      >
                        입금 승인
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id, 'REJECTED')}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition whitespace-nowrap"
                      >
                        거절
                      </button>
                    </>
                  )}
                  {order.status === 'APPROVED' && (
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded transition whitespace-nowrap"
                    >
                      완료 처리
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 완료 처리 모달 */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">주문 완료 처리</h3>
            <p className="text-slate-400 mb-4">
              주문번호: <span className="text-sky-400 font-mono">{selectedOrder.orderNumber}</span>
            </p>

            <label className="block text-sm font-medium mb-2">전달 정보</label>
            <textarea
              value={deliveryInfo}
              onChange={(e) => setDeliveryInfo(e.target.value)}
              placeholder="예: 계정 ID: example@email.com&#10;비밀번호: ****&#10;이용 기간: 2024.01.01 ~ 2025.01.01"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 resize-none"
              rows={6}
            />

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleStatusChange(selectedOrder.id, 'COMPLETED')}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded transition whitespace-nowrap"
              >
                완료 처리
              </button>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setDeliveryInfo('');
        setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition whitespace-nowrap"
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
