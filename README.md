# 화니 OTT (화니오티티) — OTT 구독 상품 판매 스토어

Next.js 16 기반의 개인 OTT 구독 상품 판매 스토어입니다.
`/Users/cloud/Downloads/ott.rtf` 기획서와 `code_artifact.md` 요구사항을 기준으로 구현되었습니다.

---

## 1. 기술 스택

| 항목 | 내용 |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 6 |
| Auth | HttpOnly 쿠키 세션 + Google OAuth 2.0 |
| Email | Nodemailer (Gmail SMTP) + HTML 템플릿 |
| Storage | Vercel Blob (상품/공지 이미지) |
| Styling | Tailwind CSS 4 |

---

## 2. 라우트 구조

### 사용자 영역

| 경로 | 설명 |
| --- | --- |
| `/` | 메인 페이지 (히어로, 추천 상품, 공지 배너) |
| `/products` | 상품 목록 |
| `/products/[id]` | 상품 상세 (옵션 선택, 수량, 장바구니 담기) |
| `/cart` | 장바구니 (선택 구매/삭제/수량 변경) |
| `/checkout` | 결제 (무통장입금, 입금자명 입력) |
| `/orders` | 주문 내역 |
| `/orders/[id]` | 주문 상세 (배송/전달 정보 확인) |
| `/user` | 내 정보 요약 |
| `/user/profile` | 회원 정보 확인 및 이름 수정 |
| `/user/settings` | 비밀번호 변경, 로그아웃, 회원 탈퇴 안내 |
| `/user/orders`, `/user/payments`, `/user/cart` | 기존 경로로 리다이렉트 |
| `/auth/login`, `/auth/signup`, `/auth/verify`, `/auth/callback` | 인증 |
| `/terms`, `/privacy` | 약관 / 개인정보처리방침 |

### 관리자 영역

| 경로 | 설명 |
| --- | --- |
| `/admin` | `/admin/dashboard` 로 리다이렉트 |
| `/admin/login` | 관리자 로그인 |
| `/admin/dashboard` | 대시보드 (매출, 주문, 최근 이메일/채팅) |
| `/admin/revenue` | 매출 관리 (일간/월간, 인기 상품) |
| `/admin/orders` | 주문 관리 (승인/거절/취소/거래완료) |
| `/admin/products` | 상품 관리 (등록/수정/삭제/품절) |
| `/admin/users` | 유저 관리 (등급 변경, 블랙리스트) |
| `/admin/notices` | 공지 관리 (이미지, 노출 기간) |
| `/admin/tiers` | 역할/등급 관리 (누적 구매, 할인율, 혜택) |
| `/admin/emails` | 이메일 발송 로그 |
| `/admin/chat` | 회원 채팅 관리 |
| `/admin/logs` | 시스템 로그 |
| `/admin/settings` | 사이트/결제/이메일/OAuth/고객지원 설정 |

### 팀(별칭) 영역

`/teams` 는 관리자 콘솔의 별칭 도메인입니다. 모두 관리자 세션을 요구하며 `/admin/*` 로 리다이렉트합니다.

`/teams`, `/teams/admin`, `/teams/logs`, `/teams/settings`, `/teams/users`, `/teams/orders`, `/teams/products`

---

## 3. 핵심 비즈니스 규칙

### 회원 고유번호
가입 시 **5자리 숫자**(10000–99999)를 중복 없이 자동 부여합니다.

### 주문번호
```
YYYYMMDD + 회원고유번호(5자리) + 구매순번(최소 3자리)
```
- 2026년 9월 8일, 회원 `12345`, 첫 구매 → `2026090812345001`
- 구매순번은 3자리 zero-padding, 1000 이상이면 자릿수 그대로 유지 (`1 → 001`, `12 → 012`, `1937 → 1937`)
- 서버의 `User.purchaseSequence` 를 트랜잭션 내에서 증가시켜 생성하므로 중복되지 않습니다.

### 주문 상태 흐름
```
PENDING ──▶ APPROVED ──▶ COMPLETED   (거래완료 시 매출 반영)
   │            │
   ├──▶ REJECTED│
   └──▶ CANCELLED ◀──┘  (APPROVED 상태에서 취소 시 재고 복원)
```

### 회원 등급
`USER` → `SILVER` → `GOLD` → `PLATINUM` → `DIAMOND`

거래완료 누적 구매금액이 `TierConfig.minPurchase` 를 넘으면 자동 승급하며,
등급별 `discountRate` 가 주문 시점에 적용됩니다. 모든 값은 `/admin/tiers` 에서 수정 가능합니다.

### 결제 요청 제한
24시간 내 최대 10건까지만 결제 요청이 가능합니다 (악용 방지).

---

## 4. 보안

- 비밀번호는 `bcryptjs` 로 해시 (DB 평문 저장 없음)
- 세션은 32바이트 랜덤 토큰을 DB에 저장하고 HttpOnly / SameSite=Lax 쿠키로만 전달
- 이메일 인증 코드는 SHA-256 해시 + 10분 만료로 저장
- 로그인/가입/인증/재발송에 DB 기반 Rate Limit 적용
- 모든 관리자 API 는 서버에서 세션을 재검증 (`getAdminUsername`)
- SMTP 비밀번호·Google Client Secret 은 환경변수에서만 읽고 DB에 저장하지 않음
- 주문 금액·재고·등급 할인은 클라이언트 값을 신뢰하지 않고 서버에서 재계산
- 상품/공지 이미지 업로드는 MIME 타입·매직바이트·5MB 크기 제한 검증

---

## 5. 시작하기

```bash
npm install
cp .env.example .env      # 값 입력
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

서버: http://localhost:3000
관리자: http://localhost:3000/admin/login

자세한 환경변수 설명은 [SETUP.md](./SETUP.md) 를 참고하세요.

---

## 6. 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 타입 검사 |
| `npx prisma db push` | 스키마 반영 |
| `npx prisma db seed` | 기본 설정/등급 시드 |

---

## 7. 라이선스

개인 프로젝트입니다.
