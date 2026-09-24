# 화니 OTT 스토어 개선 작업 계획

## 작업 그룹

### Agent 1: 체크아웃/입금 승인 페이지 (요구사항 1, 2, 3, 4, 8, 11)
- **checkout 페이지 redesign**: `app/checkout/page.tsx`
- **새 페이지 생성**: `app/order/complete/[orderNumber]/page.tsx` (새로고침 시 주문번호로 재접근, 사용자 소유 검증)
- **새 API 엔드포인트**: `app/api/orders/by-number/[orderNumber]/route.ts`
- **메시지 변경**: `lib/email.ts` - "입금 후 카카오톡 채널톡을 통해 제품 수령이 가능합니다."
- **복사 버튼 피드백**: "복사 완료" 상태 표시
- **카카오톡 버튼**: 더 크게, 눈에 띄게
- **주문 상태**: 실시간 표시 (초록색 동그라리)
- **계좌번호 형식**: 은행명 + 계좌번호

### Agent 2: 헤더 & 장바구니 (요구사항 5, 6)
- **공유 헤더 컴포넌트**: `app/components/Header.tsx` (인증 상태, 장바구니 개수)
- **페이지 통합**: `app/page.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`
- **장바구니 담기 수정**: 이동하지 않고 추가만
- **장바구니 개수**: 상단 버튼에 표시, 동적 업데이트
- **로그인 상태 표시**: 헤더 UI 변경

### Agent 3: 인증 및 마이페이지 (요구사항 7, 9, 10)
- **회원가입 약관 동의**: `app/auth/signup/page.tsx` + `app/api/auth/signup/route.ts`
- **구글 로그인 로고**: `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`
- **마이페이지 강화**: `app/user/page.tsx` (총 사용 금액, 구매내역, 입금대기)
- **로그아웃/회원탈퇴**: `app/api/user/withdraw/route.ts`

### Agent 4: 백엔드 & 성능 (요구사항 12, 13)
- **DB 오류 디버깅**: `app/api/orders/route.ts` 및 관련 API
- **성능 개선**: 비동기 처리, 지연 시간 문제
