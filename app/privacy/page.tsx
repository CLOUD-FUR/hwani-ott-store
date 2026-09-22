import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | 화니 OTT',
  description: '화니 OTT 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold text-gray-900">화니 OTT</Link>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">홈으로</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Privacy Policy</p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">개인정보처리방침</h1>
        <p className="mt-4 text-sm text-gray-500">시행일: 2026년 9월 22일</p>

        <div className="mt-12 space-y-10 leading-8 text-gray-600">
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. 수집하는 개인정보</h2>
            <p>화니 OTT는 회원가입과 서비스 제공을 위해 이메일 주소, 이름, 회원 고유번호, 주문 및 결제 관련 정보를 수집할 수 있습니다. Google 로그인을 이용하는 경우 Google 계정에서 제공되는 이름과 이메일 주소를 수집할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. 개인정보의 이용 목적</h2>
            <p>수집한 정보는 회원 식별 및 로그인, 주문 처리와 배송·상품 안내, 결제 확인, 고객 문의 대응, 서비스 보안 및 부정 이용 방지에 사용됩니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. 보관 및 파기</h2>
            <p>개인정보는 이용 목적이 달성되거나 회원이 삭제를 요청한 경우 지체 없이 파기합니다. 다만 관계 법령에 따라 보관이 필요한 정보는 해당 법령에서 정한 기간 동안 보관할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. 제3자 제공 및 처리 위탁</h2>
            <p>화니 OTT는 원칙적으로 개인정보를 외부에 제공하지 않습니다. 다만 이용자의 동의가 있거나 법령에 따른 요청이 있는 경우, 또는 서비스 운영에 필요한 외부 인프라를 이용하는 경우 관련 법령과 계약에 따라 안전하게 처리합니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. 이용자의 권리</h2>
            <p>이용자는 자신의 개인정보 조회, 수정, 삭제를 요청할 수 있습니다. 요청은 아래 문의 이메일로 접수할 수 있으며, 본인 확인 후 처리합니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">6. 개인정보 보호 문의</h2>
            <p>개인정보 처리와 관련한 문의는 아래 이메일로 보내주세요.</p>
            <p className="mt-2 font-medium text-gray-900">이메일: youhwan794223@gmail.com</p>
          </section>
        </div>
      </article>
    </main>
  );
}
