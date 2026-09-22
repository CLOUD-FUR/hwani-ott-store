# 화니 OTT 스토어 구축 완료

https://linkid.pw, https://graytag.co.kr/home, https://wooritube.com 스타일의 상품 판매 스토어가 완성되었습니다.

## ✅ 구현된 기능

### 📱 사용자 기능
- Google OAuth 소셜 로그인
- 5자리 회원 고유 ID 자동 생성 (10000-99999)
- 상품 목록 및 상세 페이지
- 상품 옵션 선택 및 구매
- 마이페이지 (주문 내역, 회원 정보)
- 실시간 공지사항 배너

### 🔐 관리자 대시보드 (`admin` / `admin`)
- **매출 관리**: 일간/월간 차트, 인기 상품, 통계
- **결제 관리**: 결제 내역, 상태 변경
- **제품 관리**: 상품 추가/수정/삭제, 옵션 설정
- **유저 관리**: 회원 검색, 역할 변경, 상세 정보
- **구매 관리**: 주문 상태 변경 (대기/처리중/완료/취소/환불)
- **공지사항 관리**: 배너 추가/수정/삭제, 기간 설정
- **역할 관리**: USER, SILVER, GOLD, PLATINUM, DIAMOND
- **시스템 로그**: 모든 활동 로그 기록 (접근/회원가입/주문/결제 등)
- **설정**: Google OAuth, 카카오톡, 채널톡 URL 설정

### 🎯 주요 특징
- **주문번호 형식**: `년도+월+일+회원ID+구매번호` (예: 20260921123450001)
- **로그 시스템**: 모든 사용자 활동 자동 기록
- **역할별 등급**: 5단계 회원 등급 시스템
- **대시보드 설정**: Google OAuth, 소셜 링크 등 관리자가 직접 설정 가능

## 🚀 시작하기

### 1. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일에서 DATABASE_URL, SMTP 설정 등 입력
```

### 2. 데이터베이스 설정
```bash
npm install
npx prisma contract emit
npx prisma db update
```

### 3. 서버 실행
```bash
npm run dev
```

## 📋 설정 가이드

### PostgreSQL 설정
1. PostgreSQL 15 이상 설치
2. 데이터베이스 생성: `CREATE DATABASE hwani_ott;`
3. `.env`에 연결 문자열 입력

### Gmail SMTP 설정
1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성
3. `.env`에 이메일과 앱 비밀번호 입력

### Google OAuth 설정
1. Google Cloud Console에서 OAuth 클라이언트 생성
2. 리디렉션 URI: `http://localhost:3000/api/auth/google/callback`
3. 관리자 대시보드 → 설정에서 Client ID/Secret 입력

## 🎨 디자인
- **컬러**: 다크 네이비/슬레이트 베이스 (#0F172A)
- **액센트**: 스카이 블루 (#38BDF8) + 오렌지 (#F97316)
- **타이포그래피**: 시스템 폰트 (Inter 스타일)
- **레이아웃**: 깔끔한 카드 기반, 8-16px 라운드

## 📁 주요 파일
```
/app/page.tsx                    # 메인 페이지
/app/products/[id]/page.tsx      # 상품 상세
/app/admin/dashboard/page.tsx    # 관리자 대시보드
/app/admin/revenue/page.tsx      # 매출 관리
/app/admin/products/page.tsx     # 상품 관리
/app/api/auth/google/route.ts    # Google OAuth
/src/prisma/contract.prisma      # 데이터베이스 스키마
```

## ⚠️ 다음 단계
1. PostgreSQL 설치 및 DATABASE_URL 설정
2. Gmail SMTP 설정
3. `npm run dev` 실행
4. 관리자 로그인 후 상품 등록
5. Google OAuth 설정 (선택)

모든 기능이 구현되었으니 환경 설정 후 바로 사용하실 수 있습니다!
