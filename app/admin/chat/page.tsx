// 관리자 채팅 페이지
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  senderType: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface ChatRoom {
  roomId: string;
  latestMessage: ChatMessage | null;
  unreadCount: number;
}

export default function AdminChatPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showMobileRooms, setShowMobileRooms] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(
        `/api/admin/chat?roomId=${encodeURIComponent(roomId)}&page=1&limit=100`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);

        // 읽음 처리 (user 메시지)
        await fetch('/api/admin/chat', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        });

        // 방 목록에서 읽음 카운트 업데이트
        setRooms((prev) =>
          prev.map((room) =>
            room.roomId === roomId
              ? { ...room, unreadCount: 0 }
              : room
          )
        );

        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Messages fetch error:', error);
    }
  }, [router]);

  const sendMessage = async () => {
    if (!selectedRoomId || inputValue.trim().length === 0) return;
    if (inputValue.length > 2000) {
      alert('메시지는 2000자를 초과할 수 없습니다.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          content: inputValue.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setInputValue('');
        setTimeout(scrollToBottom, 100);
      } else {
        alert(data.error || '메시지 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 방 선택
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowMobileRooms(false);
    fetchMessages(roomId);
  };

  // 폴링: 5초 간격으로 방 목록 및 선택된 방의 메시지 새로고침
  useEffect(() => {
    let isFirstFetch = true;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/chat', {
          cache: 'no-store',
        });

        if (!res.ok) {
          router.push('/admin/login');
          return;
        }

        const data = await res.json();
        if (data.success) {
          const fetchedRooms = data.data.rooms || [];
          setRooms(fetchedRooms);

          // 자동으로 가장 최근 방 선택 (처음 로드 시)
          if (fetchedRooms.length > 0 && selectedRoomId === null) {
            setSelectedRoomId(fetchedRooms[0].roomId);
          }
        }

        // 선택된 방의 메시지도 새로고침
        if (selectedRoomId) {
          const msgRes = await fetch(
            `/api/admin/chat?roomId=${encodeURIComponent(selectedRoomId)}&page=1&limit=100`,
            { cache: 'no-store' }
          );

          if (msgRes.ok) {
            const msgData = await msgRes.json();
            if (msgData.success) {
              const newMessages: ChatMessage[] = msgData.data.messages || [];
              // 기존 메시지와 병합 (중복 제거)
              setMessages((prev) => {
                const prevIds = new Set(prev.map((m) => m.id));
                const incoming = newMessages.filter((m) => !prevIds.has(m.id));
                if (incoming.length === 0) return prev;
                return [...prev, ...incoming].sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                );
              });

              // 읽음 처리
              await fetch('/api/admin/chat', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: selectedRoomId }),
              });

              // 방 목록에서 읽음 카운트 업데이트
              setRooms((prevRooms) =>
                prevRooms.map((room) =>
                  room.roomId === selectedRoomId
                    ? { ...room, unreadCount: 0 }
                    : room
                )
              );
            }
          }
        }

        if (isFirstFetch) {
          setLoading(false);
          isFirstFetch = false;
        }
      } catch (error) {
        console.error('Polling fetch error:', error);
        if (isFirstFetch) {
          setLoading(false);
          isFirstFetch = false;
        }
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedRoomId, router]);

  // 선택된 방의 메시지가 변경되면 자동 스크롤
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom();
    }
  }, [messages, loading]);

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">채팅</h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden h-[calc(100vh-180px)] flex">
          {/* 방 목록 (데스크탑: 좌측 고정 / 모바일: 토글) */}
          <div
            className={`w-64 border-r border-slate-800 flex flex-col ${
              showMobileRooms ? 'flex' : 'hidden'
            } lg:flex`}
          >
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300">채팅 방 목록</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  채팅 방이 없습니다.
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {rooms.map((room) => {
                    const isActive = room.roomId === selectedRoomId;
                    const latest = room.latestMessage;
                    const time = latest
                      ? new Date(latest.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';
                    const preview = latest
                      ? latest.content.length > 30
                        ? latest.content.slice(0, 30) + '...'
                        : latest.content
                      : '메시지가 없습니다.';

                    return (
                      <li key={room.roomId}>
                        <button
                          onClick={() => handleSelectRoom(room.roomId)}
                          className={`w-full p-3 text-left transition-colors ${
                            isActive
                              ? 'bg-slate-800 text-white'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium truncate">
                              {room.roomId}
                            </span>
                            <span className="text-xs text-slate-500">
                              {time}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 truncate">
                              {preview}
                            </span>
                            {room.unreadCount > 0 && (
                              <span className="shrink-0 ml-2 px-2 py-0.5 bg-sky-500 text-xs font-bold text-white rounded-full">
                                {room.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* 메시지 스레드 (데스크탑: 우측 / 모바일: 토글) */}
          <div
            className={`flex-1 flex flex-col ${
              showMobileRooms ? 'hidden' : 'flex'
            } lg:flex`}
          >
            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  <p>메시지가 없습니다.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderType === 'admin';
                  const time = new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                          isMine
                            ? 'bg-sky-500/20 text-sky-100'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div
                          className={`mt-1 text-xs ${
                            isMine ? 'text-sky-400/60' : 'text-slate-500'
                          }`}
                        >
                          {time}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="p-3 border-t border-slate-800">
              <div className="flex gap-2">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                  maxLength={2000}
                  rows={3}
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 resize-none text-sm text-slate-200"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || inputValue.trim().length === 0}
                  className="shrink-0 px-4 py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition font-medium"
                >
                  {sending ? '전송 중...' : '전송'}
                </button>
              </div>
            </div>
          </div>

          {/* 모바일 토글 버튼 */}
          <div className="lg:hidden fixed bottom-6 right-6 z-10">
            <button
              onClick={() => setShowMobileRooms(!showMobileRooms)}
              className="p-3 bg-sky-500 hover:bg-sky-600 rounded-full shadow-lg transition"
            >
              {showMobileRooms ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-white"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M9 18h6" />
                  <path d="M12 5v13" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-white"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M3 12h2v2H3z" />
                  <path d="M7 12h2v2H7z" />
                  <path d="M11 12h2v2h-2z" />
                  <path d="M15 12h2v2h-2z" />
                  <path d="M3 18h2v-2H3z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
