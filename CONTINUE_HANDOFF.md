# 화니 OTT 이어서 작업하기 위한 인수인계

작성 목적: 새 Claude Code 세션이 현재 작업을 정확히 이어갈 수 있도록 요구사항, 완료 상태, 미완료 상태, 다음 작업 순서를 기록한다.

## 작업 위치 및 프로젝트

- 프로젝트 경로: `/Users/cloud/Downloads/OTT SERVICE/hwani-ott-store`
- GitHub: `https://github.com/CLOUD-FUR/hwani-ott-store.git`
- 배포: Vercel 프로젝트 `hwani-ott-store`
- 운영 도메인: `https://www.xn--9i1b408a2kja054b.com` (브라우저 표시명은 한글 도메인)
- 요구사항 원문: `/Users/cloud/Downloads/code_artifact.md`
- 관리자 디자인 참고: `/Users/cloud/Downloads/FLUFFY_LINK/src/app/admin`
- 추가 관리자 UI 참고: `/Users/cloud/Downloads/CLOUD_HOSTING/components/admin`, `/Users/cloud/Downloads/CLOUD_HOSTING/app/admin`
- 현재 로고: `/Users/cloud/Downloads/OTT.png` → 프로젝트 `public/OTT.png`

## 사용자 확정 사항

- 상호명: 화니 OTT (화니오티티)
- 상품: 관리자가 대시보드에서 직접 등록
- DB: Neon PostgreSQL
- 이메일: Gmail SMTP
- Google OAuth: 정식 배포용
- 회원 등급: `USER`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND` (`PLATFORM`이 아님)
- 상품 전달: 현재 관리자 수동 전달. 향후 자동 데이터 전달 기능 확장 가능하도록 `deliveryData`/전달 인터페이스 여지를 둔다.
- 임시 관리자 계정: `admin` / `admin` (환경 변수 기반; 운영 전 반드시 강한 값으로 변경)
- 디자인: 공개 스토어는 밝은 화이트/GMarketSans/부드러운 애니메이션, 관리자는 FLUFFY_LINK/CLOUD_HOSTING 스타일의 Pretendard 계열, indigo-purple accent, light/dark, sidebar/topbar/card/chart.

## code_artifact.md 필수 기능 요약

1. Google 또는 이메일 가입/로그인 + 이메일 인증 코드
2. 회원만 구매 가능; 비회원 장바구니/구매 시 로그인 유도
3. 세션 유지 장바구니: 전체/선택 구매, 담기, 닫기, 삭제, 수량, 옵션 확인
4. 관리자 상품 CRUD
5. 가격/원가/판매가/사진/설명/드롭다운 옵션 계층
6. 무통장입금 결제: 관리자 계좌 설정, 이메일 필수, 예금주명, 계좌/금액/주문번호 표시 및 복사
7. HTML 이메일
8. 관리자 설정 Kakao/ChannelTalk 바로가기, 입금 후 주문번호 전달 안내, 24시간 결제요청 최대 10개
9. 관리자 보안
10. 예외처리/보안
11. 회원별 5자리 고유 ID
12. 주문번호 `YYYYMMDD + 회원5자리 + 사용자 누적 구매 sequence`, sequence는 최소 3자리(001), 1000 이상은 4자리 이상
13. checkout/cart 옵션·이메일·결제수단·입금자명
14. 관리자 탭: 매출, 결제, 제품, 유저, 구매, 공지, 역할, 로그
15. 매출 일/주/월/전체, 세션/상품 클릭/판매/매출, count-up/그래프
16. 유저 provider 구분, 상세/누적구매/역할/이력/블랙리스트/삭제 사유
17. 주문 요청 저장, 수동 승인/거절, 승인 후 취소/거래완료, 거래완료만 매출 반영
18. 공지 CRUD/이미지/기간/홈 배너/하루 숨김
19. 등급별 누적금액/할인율/혜택 설정
20. 모든 접근/가입/로그인/구매/수정/추가/관리자 로그
21. `/admin`, `/terms`, `/privacy`, `/product/[id]`, `/user` 및 필요한 추가 routes

## 이번 세션에서 완료한 기반 작업

### Prisma/DB

- Prisma 8 experimental contract (`src/prisma/contract.*`, `prisma.config.ts`, `@prisma/orm-postgres`) 제거 작업 진행 중.
- 표준 `prisma`/`@prisma/client` 6.19.0 설치.
- canonical schema는 `prisma/schema.prisma`.
- `lib/prisma.ts`는 typed PrismaClient singleton으로 변경.
- Neon에 `npx prisma db push --skip-generate` 성공.
- `npx prisma db seed` 성공: Settings와 USER/SILVER/GOLD/PLATINUM/DIAMOND TierConfig 생성.
- `prisma/seed.ts` 생성.
- schema에 Session, AdminSession, RateLimit, verifyExpires, googleId, deliveryInfo, deliveryData, Settings site/SMTP metadata, TierConfig benefits, enum Role/OrderStatus/LogType 추가.

### Auth/session 기반

- `lib/auth.ts`에 DB-backed user/admin session, secure random token, verify/delete, rate-limit, unique 5-digit ID, order number 함수 추가.
- `lib/logger.ts`에 Prisma LogType 기반 로깅으로 수정.
- `lib/email.ts`에 env SMTP fallback, HTML verification/order email, status email 추가.
- signup/login은 bcrypt + rate-limit + HttpOnly `session` cookie 방향으로 수정 중.
- admin login/logout/me routes 생성: `app/api/admin/auth/{login,logout,me}/route.ts`.
- `middleware.ts` 생성: `/admin/*`, `/api/admin/*` 보호 방향.
- Google OAuth에 state cookie 검증, DB user upsert, HttpOnly session 방향으로 수정 중.
- 공개 로그인 페이지에 email/password 입력 및 관리자 링크 제거.

## 현재 확실한 미완료/오류

### 반드시 먼저 해결

1. `npm run build`가 아직 실패한다.
2. `request.cookies`를 쓰는 Route Handler들은 Next.js 16에서 `cookies()`를 사용해야 한다.
   - 수정 대상: `app/api/auth/google/callback/route.ts`, `app/api/cart/route.ts`, `app/api/orders/route.ts`, `middleware.ts`, 기타 auth routes.
3. `lib/auth.ts`의 Node `crypto`를 middleware에서 import하면 Edge Runtime 오류가 난다.
   - 해결: middleware는 auth helper를 직접 import하지 말고 cookie 존재/별도 Edge-safe 검증 구조를 쓰거나, middleware는 redirect 최소화하고 각 admin route에서 `requireAdmin`을 수행한다.
4. `lib/email.ts`에 `sendOrderStatusEmail` export가 추가됐는지 확인하고 build 오류 해결.
5. Prisma enum 값 오류를 모두 uppercase로 정리: `ADMIN`, `ORDER_CREATE` 대신 실제 enum에 맞는 `ADMIN`, `ORDER` 등.
6. Notice API의 `link` 필드가 schema에 없음. `image` 또는 schema에 `link`를 추가하는 방식 중 하나로 통일.
7. Tier API의 `description`을 `benefits`로 통일.
8. Google callback이 Settings에 없는 `googleClientSecret`을 읽지 않게 수정. Client Secret은 env-only.
9. API request/response 타입과 Prisma relation 이름을 schema와 맞추기.

### 기능상 큰 미완료

1. `GET /api/products`가 여전히 빈 배열을 반환함 → DB-backed public product list로 교체.
2. `GET /api/notices`가 빈 배열 반환 → active/date 조건으로 DB 조회.
3. admin products API 없음 → `app/api/admin/products/route.ts`, `[id]/route.ts` 생성.
4. admin settings API 없음 → authenticated GET/PUT 생성, secret fields 반환 금지.
5. admin revenue API 없음 → date range stats 생성.
6. admin upload API 없음 → 이미지 타입/크기 검증 후 저장 방식 구현(Vercel Blob 또는 안전한 URL 입력; secret 필요 시 env).
7. Product detail 구매 TODO → cart API와 연결.
8. Cart UI/checkout UI/order list UI가 충분히 구현되지 않음.
9. Admin shared shell이 아직 안정적으로 완성되지 않음. `app/admin/components`가 untracked 상태일 수 있으므로 확인.
10. 모든 admin API에 cookie/session 기반 `requireAdmin` 추가 필요.
11. 현재 public UI/API 일부가 Authorization/localStorage 패턴 잔재를 가짐 → HttpOnly cookie로 통일.
12. Google OAuth callback에서 fake fallback JWT를 절대 사용하지 말고, DB 연결 실패는 오류로 처리.
13. `/admin` index route 추가 후 `/admin/dashboard`와 일관성 유지.
14. `/user` 또는 `/mypage`, `/cart`, `/checkout`, `/orders`, `/orders/[id]` 화면을 code_artifact 요구사항대로 추가.
15. 주문은 반드시 서버에서 상품/옵션/가격 재검증 후 transaction으로 생성해야 함.
16. orderNumber count 경쟁 조건 해결 필요. DB sequence/transaction lock 전략 사용.
17. cart cleanup은 주문한 정확한 line만 삭제.
18. settings public API는 bank/social public fields만 반환하고 SMTP/Google secret 금지.
19. 공지 content는 XSS-safe rendering 필요.
20. admin 사용자의 삭제/블랙리스트/주문상태 변경은 audit log와 ownership/role check 필수.

## 기존 build에서 확인된 오류 유형

- Next.js 16 dynamic route context는 `{ params: Promise<{ id: string }> }` 형식.
- `request.cookies`는 Web Request 타입에 없어 `const cookieStore = await cookies()` 필요.
- Prisma LogType/OrderStatus/Role은 uppercase enum.
- schema에 존재하지 않는 `link`, `description`, `googleClientSecret`, 일부 `deliveryInfo` 사용 금지.
- `middleware.ts`가 Node `crypto`를 가져오는 `lib/auth.ts`를 import하면 Edge Runtime 오류.
- `@types/nodemailer` 타입과 `nodemailer.Transporter` import 문제 발생 시 `import type` 또는 명시 타입 수정.

## 현재 작업 이어가기 순서

1. `npm run build` 실행 → 오류 목록을 하나씩 0개까지 제거.
2. `npm run lint`, `npx tsc --noEmit` 실행.
3. canonical Prisma schema 재생성/seed 확인.
4. `lib/auth.ts`, cookies, admin require helper 안정화.
5. auth/signup/login/verify/logout/me + admin auth end-to-end API 테스트.
6. public products/notices/cart/orders APIs를 실제 DB에 연결.
7. missing admin products/settings/revenue/upload APIs 추가.
8. admin shell과 각 탭 API/UI를 연결.
9. public cart/checkout/order UI와 product detail 구매 연결.
10. 브라우저 E2E: signup→verify→login→cart→checkout→bank order→admin approve/reject/complete→email/revenue.
11. Git commit/push 후 Vercel Preview 확인.

## 중요한 환경 변수

프로젝트 `.env`는 gitignore 상태이며 커밋하지 않는다.

```env
DATABASE_URL=<Neon pooled URL>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youhwan794223@gmail.com
SMTP_PASSWORD=<Gmail app password; chat에 노출된 값은 최종 배포 전 rotate>
JWT_SECRET=<legacy; cookie session 전환 후 제거 가능>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
GOOGLE_CLIENT_ID=<Vercel Production>
GOOGLE_CLIENT_SECRET=<Vercel Production secret>
GOOGLE_REDIRECT_URI=https://www.xn--9i1b408a2kja054b.com/api/auth/google/callback
NEXT_PUBLIC_API_URL=https://www.xn--9i1b408a2kja054b.com
```

## 사용자 확정 응답

- 등급: `PLATINUM`
- 관리자: 현재 `admin/admin`, 나중에 변경
- 전달: 현재 관리자 수동 전달, 미래 자동 전달 확장
- admin UI: FLUFFY_LINK/CLOUD_HOSTING 시각 언어 사용

## 보안 주의

- `.env`, Neon URL, Gmail 앱 비밀번호, Google secret을 커밋/채팅 공유하지 않는다.
- admin/admin은 임시 값이며 정식 운영 전에 반드시 변경한다.
- 구글 OAuth code/token을 URL/localStorage에 보관하지 않는다.
- 모든 admin API는 cookie session 검증을 직접 수행한다.
- 주문 금액/상품/옵션/재고를 client 값을 신뢰하지 않는다.
- 비밀번호는 bcrypt, 세션은 랜덤 token hash/HttpOnly cookie, verification code는 hash+expiry를 사용한다.
