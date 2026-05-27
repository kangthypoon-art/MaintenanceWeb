# 01. 시스템 아키텍처

---

## 1. 시스템 개요

**프로젝트명**: 유지보수 예방점검 일정 관리 시스템 (Maintenance Preventive Inspection Scheduler)

**목적**: 협력사 엔지니어가 현장 PC를 방문 점검하는 예방정비 일정을 체계적으로 등록/관리하고, 관리자가 전체 현황을 모니터링·엑셀로 보고하는 웹 애플리케이션. Flutter Android 앱을 웹으로 완전 마이그레이션한다.

**마이그레이션 배경**: 기존 NestJS 백엔드와 PostgreSQL DB는 완성 상태이므로 그대로 재사용한다. 신규 개발 범위는 Next.js 14 프론트엔드와 Docker 컨테이너 통합 배포 구성이다.

### 사용자 역할

| 역할 | 설명 | 접근 범위 |
|------|------|---------|
| **admin** | 시스템 전체 관리자 | 대시보드, 전체 일정 관리, 업체/사용자 CRUD, 엑셀 익스포트, 시스템 설정 |
| **partner** | 협력사 소속 엔지니어 | 본인 업체 일정 조회, 일정 등록 마법사, 알림 |

### 핵심 기능 5가지

1. **예방점검 일정 등록 및 관리**: 날짜·시간·PC 번호 자동 배정, 중복 예방, 다일(多日) 점검 지원
2. **PC 좌석 제한 및 가용 시간대 추천**: `global_max_pc_count` 설정 기반 일별 예약 한도 관리
3. **관리자 대시보드**: 연간 진행도 차트, 업체별 완료율, 미예약 긴급 업체 KPI
4. **D-7 알림**: 매일 자정 NestJS Cron이 실행되어 7일 이내 미예약 업체 엔지니어에게 알림 발송
5. **엑셀 익스포트**: 연도/월/업체 필터 기반 xlsx 파일 생성 및 다운로드

---

## 2. 기술 스택

| 레이어 | 기술 | 버전 | 선택 근거 |
|--------|------|------|---------|
| **Frontend** | Next.js (App Router) | 14.x | 파일 기반 라우팅, 서버 컴포넌트, 미들웨어 인증 처리 |
| **Frontend** | TypeScript | 5.x | 타입 안전성, NestJS DTO와 인터페이스 공유 가능 |
| **Frontend** | Tailwind CSS | 3.x | 유틸리티 클래스 기반 빠른 스타일링 |
| **Frontend** | shadcn/ui | 최신 | Radix UI 기반 접근성 완비 컴포넌트, 커스터마이즈 용이 |
| **Frontend** | Zustand | 4.x | 경량 전역 상태 관리, 인증 토큰·사용자 정보 보관 |
| **Frontend** | TanStack Query | 5.x | 서버 상태 캐싱, 로딩/에러 핸들링 자동화, 폴링 지원 |
| **Frontend** | React Hook Form + Zod | 7.x / 3.x | 폼 검증 + 스키마 타입 추론 |
| **Frontend** | Recharts | 2.x | 대시보드 차트 (바, 파이, 라인) |
| **Backend** | NestJS | 10.x | 기존 완성 코드 재사용 (변경 없음) |
| **Backend** | Prisma ORM | 5.x | 기존 완성 스키마 재사용 (변경 없음) |
| **DB** | PostgreSQL | 15 | 기존 완성 DB 재사용 (변경 없음) |
| **인증** | JWT (Access + Refresh) | — | 기존 NestJS auth 모듈 그대로, 쿠키 httpOnly 저장 추가 |
| **배포** | Docker Compose | v2 | 데스크톱 단일 서버 배포, 3 서비스 통합 |

---

## 3. 전체 폴더 구조

```
C:\AIProjects\WepApp\
├── _workspace\                        # 설계 문서
│   ├── 00_input.md
│   ├── 01_architecture.md
│   ├── 02_api_spec.md
│   └── 03_db_schema.md
│
├── frontend\                          # Next.js 14 App Router
│   ├── public\
│   │   └── icons\
│   ├── src\
│   │   ├── app\                       # App Router 페이지 및 레이아웃
│   │   │   ├── (auth)\                # 인증 불필요 라우트 그룹
│   │   │   │   ├── login\
│   │   │   │   │   └── page.tsx
│   │   │   │   └── signup\
│   │   │   │       └── page.tsx
│   │   │   ├── (protected)\           # 인증 필요 라우트 그룹
│   │   │   │   ├── layout.tsx         # 공통 사이드바 + 헤더 레이아웃
│   │   │   │   ├── admin\
│   │   │   │   │   ├── dashboard\
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── schedule\
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── companies\
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── excel\
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── settings\
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── partner\
│   │   │   │   │   ├── schedule\
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── booking\
│   │   │   │   │       └── page.tsx
│   │   │   │   └── notifications\
│   │   │   │       └── page.tsx
│   │   │   ├── layout.tsx             # 루트 레이아웃 (Provider 주입)
│   │   │   └── globals.css
│   │   ├── components\
│   │   │   ├── ui\                    # shadcn/ui 기본 컴포넌트
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   └── toast.tsx
│   │   │   ├── layout\                # 레이아웃 컴포넌트
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── NotificationBell.tsx
│   │   │   ├── auth\                  # 인증 관련 컴포넌트
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SignupForm.tsx
│   │   │   ├── dashboard\             # 대시보드 컴포넌트
│   │   │   │   ├── KpiCards.tsx
│   │   │   │   ├── AnnualProgressChart.tsx
│   │   │   │   ├── CompanyCompletionChart.tsx
│   │   │   │   └── UrgentCompanyList.tsx
│   │   │   ├── schedule\              # 일정 관련 컴포넌트
│   │   │   │   ├── ScheduleCalendar.tsx
│   │   │   │   ├── ScheduleTable.tsx
│   │   │   │   ├── ScheduleStatusBadge.tsx
│   │   │   │   └── ScheduleDetailModal.tsx
│   │   │   ├── booking\               # 일정 등록 마법사 컴포넌트
│   │   │   │   ├── BookingWizard.tsx
│   │   │   │   ├── Step1Company.tsx
│   │   │   │   ├── Step2DateTime.tsx
│   │   │   │   ├── Step3Contract.tsx
│   │   │   │   └── Step4Confirm.tsx
│   │   │   ├── companies\             # 업체 관리 컴포넌트
│   │   │   │   ├── CompanyTable.tsx
│   │   │   │   ├── CompanyForm.tsx
│   │   │   │   └── ContractManager.tsx
│   │   │   └── notifications\
│   │   │       └── NotificationList.tsx
│   │   ├── hooks\                     # 커스텀 훅
│   │   │   ├── useAuth.ts
│   │   │   ├── useSchedules.ts
│   │   │   ├── useCompanies.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useAvailableSlots.ts
│   │   ├── stores\                    # Zustand 스토어
│   │   │   ├── authStore.ts
│   │   │   └── uiStore.ts
│   │   ├── lib\                       # 유틸리티
│   │   │   ├── api.ts                 # axios 인스턴스 + 인터셉터
│   │   │   ├── queryClient.ts         # TanStack Query 설정
│   │   │   └── utils.ts
│   │   ├── types\                     # TypeScript 타입 정의
│   │   │   ├── api.ts                 # API 요청/응답 타입
│   │   │   ├── models.ts              # 도메인 모델 타입
│   │   │   └── enums.ts
│   │   └── middleware.ts              # Next.js 라우트 보호 미들웨어
│   ├── .env.local
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend\                           # NestJS (기존 코드 재사용)
│   ├── src\
│   │   ├── auth\
│   │   ├── schedules\
│   │   ├── companies\
│   │   ├── users\
│   │   ├── contracts\
│   │   ├── company-contracts\
│   │   ├── reports\
│   │   ├── notifications\
│   │   ├── excel\
│   │   ├── settings\
│   │   ├── scheduler\                 # D-7 Cron Job
│   │   ├── firebase\
│   │   ├── s3\
│   │   └── prisma\
│   ├── prisma\
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations\               # 12개 마이그레이션 파일
│   ├── uploads\                       # 로컬 파일 업로드 디렉토리
│   ├── .env
│   └── package.json
│
└── docker-compose.yml
```

---

## 4. 라우팅 설계

### Next.js App Router 전체 경로

| 경로 | 역할 제한 | 설명 |
|------|---------|------|
| `/login` | 비인증 전용 | 이메일/비밀번호 로그인 |
| `/signup` | 비인증 전용 | 협력사 선택 후 회원가입 |
| `/admin/dashboard` | admin | 연간 KPI, 차트, 긴급 업체 목록 |
| `/admin/schedule` | admin | 전체 일정 캘린더 + 테이블 뷰 |
| `/admin/companies` | admin | 업체 CRUD + 계약 관리 |
| `/admin/excel` | admin | 연도/월/업체 필터 → xlsx 다운로드 |
| `/admin/settings` | admin | PC 대수, 점검 시간, 알림 설정 |
| `/partner/schedule` | partner | 내 일정 캘린더 + 파이차트 |
| `/partner/booking` | partner | 4단계 일정 등록 마법사 |
| `/notifications` | admin, partner | 알림 목록, 읽음 처리 |

### middleware.ts 보호 로직

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATHS = ['/admin'];
const PARTNER_PATHS = ['/partner'];
const PROTECTED_PATHS = [...ADMIN_PATHS, ...PARTNER_PATHS, '/notifications'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('accessToken')?.value;
  const role = req.cookies.get('userRole')?.value;

  // 인증 필요 경로 진입 시 토큰 없으면 /login 으로 리다이렉트
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 역할 불일치 시 본인 기본 경로로 리다이렉트
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/partner/schedule', req.url));
  }
  if (pathname.startsWith('/partner') && role !== 'partner') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  // 이미 로그인된 상태에서 /login, /signup 접근 시 역할별 홈으로 리다이렉트
  if ((pathname === '/login' || pathname === '/signup') && token) {
    const home = role === 'admin' ? '/admin/dashboard' : '/partner/schedule';
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/partner/:path*', '/notifications/:path*', '/login', '/signup'],
};
```

---

## 5. 인증 흐름

### JWT 발급 → 저장 → 만료 → 갱신 흐름도

```
[사용자] → POST /api/auth/login
    → NestJS 검증 (bcrypt 비교)
    → accessToken (1일 만료) + refreshToken (7일 만료) 반환

[프론트엔드 로그인 성공 처리]
    → accessToken → httpOnly 쿠키 (accessToken)
    → refreshToken → httpOnly 쿠키 (refreshToken)
    → role → 일반 쿠키 (userRole) — middleware 역할 분기용
    → Zustand authStore에 user 정보 저장

[API 요청 시]
    → axios 인스턴스가 Authorization: Bearer {accessToken} 헤더 자동 첨부
    → 401 응답 수신 시 인터셉터가 POST /api/auth/refresh 호출
    → 갱신 성공 → 새 accessToken 쿠키 교체 → 원래 요청 재시도
    → 갱신 실패 (refresh 만료) → 쿠키 전체 삭제 → /login 리다이렉트

[로그아웃]
    → 클라이언트에서 쿠키 삭제 (accessToken, refreshToken, userRole)
    → Zustand authStore 초기화
    → /login 리다이렉트
```

### 환경별 쿠키 설정

| 설정 항목 | 개발 | 프로덕션 |
|----------|------|---------|
| `httpOnly` | true | true |
| `secure` | false | true (HTTPS 필요 시) |
| `sameSite` | `lax` | `lax` |
| `maxAge` | accessToken: 86400 / refreshToken: 604800 | 동일 |

---

## 6. 컴포넌트 구조 (화면별)

### 화면 1: `/login`

```
LoginPage
└── LoginForm
    ├── Input (email)
    ├── Input (password, type="password")
    ├── Button (로그인)
    └── Link → /signup
```

### 화면 2: `/signup`

```
SignupPage
└── SignupForm
    ├── Input (이름)
    ├── Input (이메일)
    ├── Input (비밀번호)
    ├── Input (전화번호, optional)
    ├── Select (협력사 선택) ← GET /api/auth/companies
    └── Button (가입하기)
```

### 화면 3: `/admin/dashboard`

```
DashboardPage
├── KpiCards
│   ├── KpiCard (오늘 방문 건수)
│   ├── KpiCard (미예약 업체 수)
│   └── KpiCard (이달 완료율 %)
├── AnnualProgressChart     ← Recharts LineChart, 월별 완료 건수
├── CompanyCompletionChart  ← Recharts BarChart, 업체별 완료율
└── UrgentCompanyList       ← 점검 주기 초과 미예약 업체 테이블
```

### 화면 4: `/admin/schedule`

```
AdminSchedulePage
├── ScheduleCalendar        ← 날짜 셀에 일정 도트 표시
│   └── DayCell (클릭 → 날짜 선택)
├── ScheduleFilterBar
│   ├── Select (업체 필터)
│   └── Select (엔지니어 필터)
├── ScheduleTable           ← 선택 날짜 또는 월별 일정 목록
│   ├── ScheduleRow
│   │   ├── ScheduleStatusBadge
│   │   ├── Button (상태 변경)
│   │   └── Button (삭제)
│   └── ScheduleDetailModal ← 클릭 시 상세 정보
└── Button (신규 등록 → BookingWizard 모달)
```

### 화면 5: `/admin/companies`

```
CompaniesPage
├── CompanyTable
│   ├── CompanyRow
│   │   ├── Badge (점검 주기)
│   │   ├── Button (수정)
│   │   └── Button (삭제)
│   └── Button (업체 추가)
├── CompanyForm (Dialog)    ← 생성/수정 폼
└── ContractManager (Dialog) ← 업체별 계약 목록 + CRUD
    ├── CompanyContractList  ← /api/company-contracts/:code
    └── ContractList         ← /api/contracts/company/:companyId
```

### 화면 6: `/admin/excel`

```
ExcelPage
├── ExcelFilterForm
│   ├── Select (연도)
│   ├── Select (월, optional)
│   ├── Select (업체, optional)
│   └── Button (다운로드) ← GET /api/excel/export → blob 다운로드
└── ExportHistoryNote        ← 사용 안내 텍스트
```

### 화면 7: `/admin/settings`

```
SettingsPage
└── SettingsForm             ← GET /api/settings 로 현재값 로드
    ├── SettingRow (global_max_pc_count, PC 최대 대수)
    ├── SettingRow (inspection_start_time, 점검 시작 시간)
    ├── SettingRow (inspection_end_time, 점검 종료 시간)
    ├── SettingRow (d7_alert_enabled, D-7 알림 활성화)
    └── Button (저장) ← PUT /api/settings/:key
```

### 화면 8: `/partner/schedule`

```
PartnerSchedulePage
├── ScheduleCalendar         ← 본인 업체 일정만 표시
├── ContractProgressChart    ← Recharts PieChart (계약별 완료율)
└── ScheduleTimeline         ← 날짜별 타임라인 테이블
    └── ScheduleRow
        └── ScheduleStatusBadge
```

### 화면 9: `/partner/booking`

```
BookingPage
└── BookingWizard            ← 4단계 스텝 컴포넌트
    ├── StepIndicator        ← 1/2/3/4 진행 표시
    ├── Step1Company         ← 업체 선택 (파트너는 본인 업체 고정)
    ├── Step2DateTime        ← 날짜 선택 + 가용 시간대 표시
    │   └── AvailableSlotGrid ← GET /api/schedules/available-slots?date=
    ├── Step3Contract        ← 계약 선택 (GET /api/company-contracts/:code)
    └── Step4Confirm         ← 최종 확인 + POST /api/schedules
```

### 화면 10: `/notifications`

```
NotificationsPage
├── NotificationHeader
│   └── Button (모두 읽음) ← PUT /api/notifications/read-all
└── NotificationList
    └── NotificationItem    ← PUT /api/notifications/:id/read
        ├── Badge (알림 타입)
        ├── Text (메시지)
        └── Text (발송 시각)
```

---

## 7. 상태관리 전략

### Zustand 스토어 구조

```typescript
// stores/authStore.ts
interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'partner';
    companyId: string | null;
  } | null;
  isAuthenticated: boolean;
  setUser: (user: AuthState['user']) => void;
  clearUser: () => void;
}

// stores/uiStore.ts
interface UiState {
  sidebarOpen: boolean;
  selectedDate: string | null;         // 캘린더 선택 날짜 (YYYY-MM-DD)
  selectedCompanyId: number | null;    // 필터 선택 업체
  toggleSidebar: () => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedCompanyId: (id: number | null) => void;
}
```

### TanStack Query 캐싱 전략

| 쿼리 키 | staleTime | gcTime | refetchInterval | 설명 |
|---------|-----------|--------|----------------|------|
| `['schedules', year, month, companyId]` | 30초 | 5분 | — | 일정 목록 |
| `['schedule', id]` | 0 | 3분 | — | 일정 상세 |
| `['companies']` | 5분 | 10분 | — | 업체 목록 (변경 드묾) |
| `['available-slots', date]` | 0 | 1분 | — | 항상 최신 데이터 필요 |
| `['notifications']` | 0 | 2분 | 30000 (30초) | 폴링으로 실시간 효과 |
| `['notifications', 'unread-count']` | 0 | 1분 | 30000 (30초) | 헤더 뱃지 자동 갱신 |
| `['settings']` | 5분 | 10분 | — | 설정값 (변경 드묾) |
| `['engineers']` | 5분 | 10분 | — | 엔지니어 목록 |

### Mutation 이후 캐시 무효화 정책

- 일정 등록/수정/삭제 → `['schedules']` 무효화
- 업체 CRUD → `['companies']` 무효화
- 알림 읽음 처리 → `['notifications']`, `['notifications', 'unread-count']` 무효화
- 설정 변경 → `['settings']` 무효화, `['available-slots']` 무효화

---

## 8. 환경변수 목록

### 프론트엔드 (frontend/.env.local)

| 변수명 | 예시 값 | 설명 |
|--------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | 백엔드 API 기본 URL |
| `NEXT_PUBLIC_APP_NAME` | `예방점검 일정 관리` | 앱 표시 이름 |

### 백엔드 (backend/.env)

| 변수명 | 예시 값 | 설명 |
|--------|--------|------|
| `DATABASE_URL` | `postgresql://user:pass@postgres:5432/maintenance_db` | Prisma 연결 문자열 |
| `JWT_SECRET` | `your-access-secret-key` | 액세스 토큰 서명 키 |
| `JWT_REFRESH_SECRET` | `your-refresh-secret-key` | 리프레시 토큰 서명 키 |
| `JWT_EXPIRES_IN` | `1d` | 액세스 토큰 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | 리프레시 토큰 만료 시간 |
| `PORT` | `3001` | 백엔드 서버 포트 |
| `UPLOAD_DIR` | `./uploads` | 로컬 파일 업로드 경로 |

### Docker Compose 환경변수

| 변수명 | 예시 값 | 설명 |
|--------|--------|------|
| `POSTGRES_DB` | `maintenance_db` | PostgreSQL 데이터베이스명 |
| `POSTGRES_USER` | `maintenance_user` | PostgreSQL 사용자 |
| `POSTGRES_PASSWORD` | `strong_password` | PostgreSQL 비밀번호 |

---

## 9. 전체 시스템 아키텍처 다이어그램

```mermaid
graph TB
  subgraph Client["브라우저 (Client)"]
    Browser["Next.js 14\nApp Router\n:3000"]
  end

  subgraph Docker["Docker Compose Network (app-network)"]
    Frontend["frontend\nNext.js\n:3000"]
    Backend["backend\nNestJS\n:3001"]
    DB["postgres\nPostgreSQL 15\n:5432"]
    Uploads[("uploads/\n로컬 파일 스토리지")]
  end

  Browser --> Frontend
  Frontend -->|"HTTP API\n/api/*"| Backend
  Backend -->|"Prisma ORM"| DB
  Backend -->|"multer"| Uploads
  Backend -->|"@nestjs/schedule\nCron D-7 알림"| Backend

  subgraph Auth["인증 흐름"]
    JWTAccess["accessToken\nhttpOnly Cookie\n(1일)"]
    JWTRefresh["refreshToken\nhttpOnly Cookie\n(7일)"]
  end

  Frontend --- JWTAccess
  Frontend --- JWTRefresh
```

---

## 10. 프론트엔드 전달 사항

- **API Base URL**: `NEXT_PUBLIC_API_URL` 환경변수 사용, axios 인스턴스에서 baseURL 설정
- **인증 처리**: 쿠키 기반 JWT, axios 응답 인터셉터에서 401 시 자동 refresh
- **라우트 보호**: `src/middleware.ts`에서 쿠키 기반 역할 검사
- **컴포넌트 UI**: shadcn/ui 컴포넌트를 기반으로 구성, 필요 시 커스터마이즈
- **캘린더**: shadcn/ui Calendar + react-day-picker 조합 사용
- **차트**: Recharts 라이브러리 (BarChart, PieChart, LineChart)
- **폼**: React Hook Form + Zod 스키마 검증
- **알림 폴링**: TanStack Query refetchInterval 30초로 폴링 구현
- **파일 다운로드**: blob 응답을 URL.createObjectURL로 처리
- **ID 타입 주의**: 백엔드 ID는 모두 `number` (Int), API 응답에서 문자열 변환 없이 그대로 사용

## 11. 백엔드 전달 사항

- **기존 코드 재사용**: `C:\AIProjects\maintenance_app\backend` 코드 그대로 사용
- **CORS 설정 추가**: NestJS main.ts에 `app.enableCors({ origin: 'http://localhost:3000', credentials: true })`
- **쿠키 파서**: 필요 시 `cookie-parser` 미들웨어 추가
- **업로드 경로**: 개발 환경에서는 S3 대신 로컬 `uploads/` 디렉토리 사용
- **FCM**: 브라우저 Web Push로 대체 또는 알림만 DB에 저장하고 폴링으로 전달

## 12. DevOps 전달 사항

- **docker-compose.yml**: postgres, backend, frontend 3개 서비스
- **볼륨**: `postgres_data` (DB 영구 저장), `./backend/uploads` (파일 영구 저장)
- **네트워크**: `app-network` 내부 브릿지
- **헬스체크**: backend는 `/api/health` 엔드포인트 확인
- **마이그레이션**: backend 컨테이너 시작 시 `prisma migrate deploy` 자동 실행
- **포트 노출**: frontend:3000, backend:3001만 호스트에 노출, postgres는 내부만
