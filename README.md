# 화니 OTT (화니오티티) - 상품 판매 스토어

Next.js 기반의 상품 판매 스토어입니다.

## 주요 기능

### 사용자 기능
- Google OAuth 소셜 로그인
- 회원별 5자리 고유 ID 자동 생성
- 상품 구매 및 주문 관리
- 마이페이지 (주문 내역, 회원 정보)
- 실시간 공지사항

### 관리자 기능
- 매출 관리 (일간/월간 차트)
- 결제 관리
- 제품 관리 (추가/수정/삭제)
- 유저 관리 (역할 변경, 검색)
- 구매 관리 (주문 상태 변경)
- 공지사항 관리
- 역할 관리 (USER, SILVER, GOLD, PLATINUM, DIAMOND)
- 시스템 로그
- 설정 관리 (Google OAuth, 카카오톡, 채널톡 URL)

### 역할 및 등급 시스템
- USER: 기본 회원
- SILVER: 실버 등급
- GOLD: 골드 등급
- PLATINUM: 플래티넘 등급
- DIAMOND: 다이아몬드 등급

각 등급별 할인율 및 혜택은 관리자 대시보드에서 설정 가능합니다.

## 기술 스택

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 8
- **Authentication**: JWT + Google OAuth
- **Email**: Nodemailer (Gmail SMTP)
- **Styling**: Tailwind CSS

## 시작하기

### 1. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 값을 입력하세요:

```bash
cp .env.example .env
```

필수 설정:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `SMTP_*`: Gmail SMTP 설정 (앱 비밀번호 필요)
- `JWT_SECRET`: JWT 암호화 키
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: 관리자 계정

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

```bash
# Prisma contract 생성
npx prisma contract emit

# 데이터베이스 업데이트
npx prisma db update
```

### 4. 개발 서버 실행

```bash
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## 관리자 로그인

- URL: http://localhost:3000/admin/login
- 기본 계정: `admin` / `admin`

## Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. OAuth 동의 화면 구성
4. OAuth 2.0 클라이언트 ID 생성
5. 승인된 리디렉션 URI 추가: `http://localhost:3000/api/auth/google/callback`
6. 관리자 대시보드 → 설정에서 Client ID와 Secret 입력

## Gmail SMTP 설정

1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. `.env` 파일의 `SMTP_PASSWORD`에 앱 비밀번호 입력

## 주문번호 형식

`년도+월+일+회원ID+구매번호`

예: `20260921123450001`
- 2026년 09월 21일
- 회원 ID: 12345
- 구매번호: 0001

## 프로젝트 구조

```
hwani-ott-store/
├── app/                    # Next.js App Router
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API Routes
│   ├── auth/              # 인증 페이지
│   ├── mypage/            # 마이페이지
│   ├── products/          # 상품 페이지
│   └── page.tsx           # 메인 페이지
├── src/
│   ├── prisma/            # Prisma 스키마 및 타입
│   └── lib/               # 유틸리티 함수
└── public/                # 정적 파일
```

## 라이선스

이 프로젝트는 개인 프로젝트입니다.
