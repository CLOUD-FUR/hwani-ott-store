'use client';

import { useEffect, useState, useRef } from 'react';

interface SettingsData {
  kakaotalkUrl?: string | null;
  channelTalkUrl?: string | null;
}

interface SettingsResponse {
  success: boolean;
  data?: SettingsData;
}

export default function ContactWidget() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: SettingsResponse) => {
        if (data.success && data.data) {
          setSettings({
            kakaotalkUrl: data.data.kakaotalkUrl,
            channelTalkUrl: data.data.channelTalkUrl,
          });
        }
      })
      .catch((err) => console.error('ContactWidget settings fetch error:', err));
  }, []);

  // Close the panel when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [expanded]);

  const hasKakao = !!settings.kakaotalkUrl;
  const hasChannel = !!settings.channelTalkUrl;

  // Render nothing when neither contact URL is configured
  if (!hasKakao && !hasChannel) return null;

  const linkCls =
    'flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 shadow-lg text-sm font-semibold text-blue-600 ring-1 ring-slate-200 hover:bg-slate-50 transition';

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
    >
      {expanded && (
        <div className="flex flex-col gap-2">
          {hasKakao && (
            <a
              href={settings.kakaotalkUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FEE500] text-xs font-bold text-[#3C1E1E]">
                카
              </span>
              카카오톡
            </a>
          )}
          {hasChannel && (
            <a
              href={settings.channelTalkUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0063FF] text-xs font-bold text-white">
                채
              </span>
              채널톡
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? '문의하기 닫기' : '문의하기'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.09-2.79 7.55-6.79 8.63a1 1 0 0 1-1.28-.47l-1.47-3.4a1 1 0 0 0-.95-.66h-2.8a1 1 0 0 1-1-1.1V7a1 1 0 0 1 1-1h3a1 1 0 0 0 1-1V4a1 1 0 0 1-1-1H7a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1v2a1 1 0 0 0 1 1h.01"
          />
        </svg>
      </button>
    </div>
  );
}
