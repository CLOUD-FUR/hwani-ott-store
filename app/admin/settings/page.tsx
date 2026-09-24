// 관리자 설정 페이지
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  storeName: string;
  storeDescription: string;
  kakaoChannelUrl: string;
  channelTalkUrl: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    storeName: '화니 OTT',
    storeDescription: '',
    kakaoChannelUrl: '',
    channelTalkUrl: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    googleClientId: '',
    googleClientSecret: '',
    googleRedirectUri: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        cache: 'no-store',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (data.data) {
        // Map API response to the page's Settings interface fields only.
        // The API spreads raw prisma fields (e.g. kakaotalkUrl) alongside
        // the mapped names (kakaoChannelUrl); keeping only the mapped names
        // prevents stale raw fields from shadowing user edits on save.
        setSettings({
          storeName: data.data.storeName || '화니 OTT',
          storeDescription: data.data.storeDescription || '',
          kakaoChannelUrl: data.data.kakaoChannelUrl || '',
          channelTalkUrl: data.data.channelTalkUrl || '',
          bankName: data.data.bankName || '',
          bankAccount: data.data.bankAccount || '',
          bankHolder: data.data.bankHolder || '',
          smtpHost: data.data.smtpHost || 'smtp.gmail.com',
          smtpPort: data.data.smtpPort || 587,
          smtpUser: data.data.smtpUser || '',
          smtpPassword: '',
          googleClientId: data.data.googleClientId || '',
          googleClientSecret: '',
          googleRedirectUri: data.data.googleRedirectUri || '',
        });
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('설정이 저장되었습니다.');
      } else {
        alert('설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold">설정</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 rounded-lg font-medium transition"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          {[
            { id: 'general', label: '일반' },
            { id: 'payment', label: '결제' },
            { id: 'email', label: '이메일' },
            { id: 'oauth', label: 'OAuth' },
            { id: 'customer', label: '고객지원' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          {/* 일반 설정 */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">스토어 이름</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">스토어 설명</label>
                <textarea
                  value={settings.storeDescription}
                  onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 resize-none"
                  rows={4}
                  placeholder="스토어에 대한 간단한 설명을 입력하세요."
                />
              </div>
            </div>
          )}

          {/* 결제 설정 */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">은행명</label>
                <input
                  type="text"
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  placeholder="예: 국민은행"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">계좌번호</label>
                <input
                  type="text"
                  value={settings.bankAccount}
                  onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
                  placeholder="예: 123456-78-901234"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">예금주명</label>
                <input
                  type="text"
                  value={settings.bankHolder}
                  onChange={(e) => setSettings({ ...settings, bankHolder: e.target.value })}
                  placeholder="예: 홍길동"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-400">
                💡 입력한 계좌 정보는 주문 완료 후 고객에게 표시됩니다.
              </div>
            </div>
          )}

          {/* 이메일 설정 */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">SMTP 호스트</label>
                <input
                  type="text"
                  value={settings.smtpHost}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SMTP 포트</label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                  placeholder="587"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">이메일 주소</label>
                <input
                  type="email"
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">앱 비밀번호</label>
                <input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  placeholder="Gmail 앱 비밀번호 16자리"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-400">
                💡 Gmail 앱 비밀번호 생성 방법:
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Google 계정 관리 → 보안</li>
                  <li>2단계 인증 활성화</li>
                  <li>앱 비밀번호 생성 → 메일 선택</li>
                  <li>생성된 16자리 비밀번호 입력</li>
                </ol>
              </div>
            </div>
          )}

          {/* OAuth 설정 */}
          {activeTab === 'oauth' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Google Client ID</label>
                <input
                  type="text"
                  value={settings.googleClientId}
                  onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Google Client Secret</label>
                <input
                  type="password"
                  value={settings.googleClientSecret}
                  onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                  placeholder="GOCSPX-xxxxx"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Redirect URI</label>
                <input
                  type="text"
                  value={settings.googleRedirectUri}
                  onChange={(e) => setSettings({ ...settings, googleRedirectUri: e.target.value })}
                  placeholder="https://your-domain.com/api/auth/google/callback"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 font-mono text-sm"
                />
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-400">
                💡 Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성하고 여기에 입력하세요.
                <br />
                개발 중: http://localhost:3000/api/auth/google/callback
                <br />
                프로덕션: https://your-domain.com/api/auth/google/callback
              </div>
            </div>
          )}

          {/* 고객지원 설정 */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">카카오톡 채널 URL</label>
                <input
                  type="url"
                  value={settings.kakaoChannelUrl}
                  onChange={(e) => setSettings({ ...settings, kakaoChannelUrl: e.target.value })}
                  placeholder="https://pf.kakao.com/_xxxxx"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">채널톡 URL</label>
                <input
                  type="url"
                  value={settings.channelTalkUrl}
                  onChange={(e) => setSettings({ ...settings, channelTalkUrl: e.target.value })}
                  placeholder="https://example.channel.io"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-400">
                💡 입력한 URL은 스토어 하단 및 고객 문의 페이지에 표시됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
