import Link from 'next/link';

export const metadata = {
  title: '이용약관 | 화니 OTT',
  description: '화니 OTT 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold text-gray-900">화니 OTT</Link>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">홈으로</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Terms of Service</p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">서비스 이용약관</h1>
        <p className="mt-4 text-sm text-gray-500">시행일: 2026년 9월 22일</p>

        <div className="mt-12 space-y-10 leading-8 text-gray-600">
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">제1조 (목적)</h2>
            <p>이 약관은 화니 OTT(이하 “서비스”)가 제공하는 상품 판매 및 관련 온라인 서비스의 이용 조건과 절차, 이용자와 서비스 운영자의 권리와 의무를 정하는 것을 목적으로 합니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">제2조 (회원가입 및 계정)</h2>
            <p>이용자는 정확한 정보를 제공하여 회원가입을 신청해야 합니다. 이용자는 자신의 계정 정보를 안전하게 관리해야 하며, 계정의 부정 사용 사실을 알게 된 경우 즉시 서비스 운영자에게 알려야 합니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">제3조 (상품 및 주문)</h2>
            <p>상품의 상세 내용, 가격, 이용 조건은 상품 페이지에 표시합니다. 주문이 접수되면 서비스 운영자의 확인 절차를 거쳐 거래가 진행되며, 상품별 제공 조건은 주문 시 안내된 내용을 따릅니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">제4조 (결제 및 취소)</h2>
            <p>무통장입금 주문은 입금 확인 후 승인될 수 있습니다. 주문 취소, 환불 및 이용 제한은 상품의 특성과 별도 안내된 정책에 따라 처리됩니다. 이용자는 결제 전 상품 설명과 환불 조건을 확인해야 합니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">제5조 (서비스 이용 제한)</h2>
            <p>타인의 정보를 이용하거나, 서비스를 방해하거나, 관련 법령을 위반하는 행위가 확인되면 서비스 이용이 제한될 수 있습니다.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">제6조 (문의)</h2>
            <p>서비스 이용 중 문의사항은 등록된 고객센터 또는 이메일을 통해 접수할 수 있습니다.</p>
            <p className="mt-2 font-medium text-gray-900">이메일: youhwan794223@gmail.com</p>
          </section>
        </div>
      </article>
    </main>
  );
}
