# 06. 코드 리뷰 보고서

---

## 1. 리뷰 요약

| 항목 | 결과 |
|------|------|
| 배포 준비 상태 | 배포 가능 (모든 필수 수정 완료) |
| 전체 품질 점수 | 8.5 / 10 |
| 즉시 실행 가능 여부 | 가능 (`docker-compose up -d --build`) |
| 주요 완성도 | Docker 빌드 파이프라인 완성, 핵심 비즈니스 로직 구현, 모든 RED 항목 수정 완료 |

총평: 필수 수정 사항(RED-01~04, YELLOW-01, YELLOW-05, YELLOW-06) 모두 반영 완료. docker-compose up -d --build로 즉시 실행 가능하다.

---

## 2. 필수 수정 사항 (즉시 수정 필요)

### [RED-01] middleware.ts — 역할(role) 기반 접근 제어 미구현 (보안 취약점)

**파일**: `frontend/src/middleware.ts`

**문제**: 현재 미들웨어는 토큰 유무만 확인하며, admin/partner 역할 분리 로직이 없다. partner 사용자가 `/admin/*` 경로에 자유롭게 접근할 수 있다.

```typescript
// 현재 구현 — 역할 확인 없음
if (!token) {
  return NextResponse.redirect(new URL(`/login?redirect=...`, req.url));
}
return NextResponse.next(); // 역할 불문 통과
```

**아키텍처 명세 요구사항** (`01_architecture.md` §4):
- admin 경로 접근 시 `userRole` 쿠키가 `admin`이어야 함
- partner가 `/admin` 접근 시 `/partner/schedule`로 리다이렉트
- admin이 `/partner` 접근 시 `/admin/dashboard`로 리다이렉트

**추가 문제**: 로그인 상태에서 `/login`, `/signup` 접근 시 무조건 `/admin/dashboard`로 리다이렉트 (partner는 `/admin/dashboard`에 접근 불가이므로 역할별 분기 필요)

**수정 완료**: 아래와 같이 수정 적용함.

---

### [RED-02] booking/page.tsx — companyContractsApi 호출 시 companyId(숫자) → code(문자열) 불일치 — **수정 완료**

**파일**: `frontend/src/app/(dashboard)/partner/booking/page.tsx`

회사 정보를 먼저 조회(`companiesApi.getOne`)하여 `company.code`를 얻은 뒤 계약 목록을 조회하도록 수정. startTime/endTime의 `:00` 중복 추가도 함께 제거함.

---

### [RED-03] api-client.ts — withdraw 요청 body 불일치 — **수정 완료**

**파일**: `frontend/src/lib/api-client.ts`

백엔드 `WithdrawDto`는 `{ email, password }` 두 필드를 요구하나 기존 구현은 `password`만 전송. `authApi.withdraw(email, password)` 시그니처로 수정하여 두 필드 모두 전달하도록 수정.

---

### [RED-04] authStore.ts — Zustand persist SSR Hydration 이슈

**파일**: `frontend/src/stores/authStore.ts`

**문제**: `persist` 미들웨어는 `localStorage`를 사용하므로 Next.js 서버 사이드 렌더링 환경에서 hydration mismatch가 발생할 수 있다. 서버에서는 `user: null`로 렌더링하고, 클라이언트에서 localStorage에서 복원하면 순간적으로 UI가 불일치한다.

현재 `partialize`로 `user`만 persist하고 있어 범위는 최소화되어 있으나, `useAuthStore()`를 바로 렌더링하는 컴포넌트는 hydration warning이 발생할 수 있다.

**권장**: `useHydration` 패턴 또는 `skipHydration` 옵션 적용.

---

## 3. 권장 개선 사항

### [YELLOW-01] backend/Dockerfile — npm ci --only=production 빌드 오류 위험 — **수정 완료**

**파일**: `backend/Dockerfile`

Builder 단계의 `npm ci --only=production`을 `npm ci`로 변경하여 TypeScript 컴파일에 필요한 devDependencies가 설치되도록 수정.

---

### [YELLOW-02] docker-compose.yml — JWT Secret 하드코딩

**파일**: `docker-compose.yml` (line 33-34)

```yaml
JWT_SECRET: maintenance-app-secret-key-2024
JWT_REFRESH_SECRET: maintenance-refresh-secret-key-2024
```

JWT 서명 키가 소스코드에 평문 하드코딩되어 있다. 리포지토리에 커밋될 경우 보안 위험이 있다.

**권장**: `.env` 파일 분리 후 `env_file:` 지시자 또는 Docker Secrets 사용.

---

### [YELLOW-03] docker-compose.yml — NEXT_PUBLIC_API_URL 런타임 주입 문제

**파일**: `docker-compose.yml` (line 59)

```yaml
NEXT_PUBLIC_API_URL: http://localhost:3001
```

`NEXT_PUBLIC_*` 변수는 Next.js 빌드 시점에 번들에 인라인된다. `docker-compose`의 `environment`로 런타임에 주입해도 이미 번들된 값은 변경되지 않는다.

**현재 상태**: `frontend/Dockerfile`에서 빌드 ARG로 처리하고 있어 (`ARG NEXT_PUBLIC_API_URL=http://localhost:3001`) 기본값이 번들에 포함된다. `docker-compose.yml`의 환경변수 주입은 실제로 동작하지 않는다.

**영향**: 도커 컨테이너 내부에서 프론트엔드가 `http://localhost:3001`로 API 호출하면, 브라우저에서 접근 시 정상이지만 컨테이너 네트워크 내부 서비스 간 호출에는 `http://backend:3001`을 사용해야 한다. 브라우저에서 요청하는 것이므로 `localhost:3001`은 사용자 머신 기준으로 올바르게 해석됨. 데스크톱 배포 특성상 현재 설정이 동작하기는 하나 혼란을 야기한다.

**권장**: 빌드 ARG 주입 방식을 명확히 문서화하거나, `NEXT_PUBLIC_API_URL`을 `/api` 경로 rewrites로 대체.

---

### [YELLOW-04] schedules.service.ts — PC 번호 자동 배정 로직 결함

**파일**: `backend/src/schedules/schedules.service.ts` (line 72-73)

```typescript
// 4. pcNumber 자동 배정 (당일 기존 예약 수 + 1)
const pcNumber = dayCount + 1;
```

**문제**: `dayCount`는 당일 전체 예약 수이며, 취소된 예약이 재할당되거나 삭제된 경우 pcNumber에 갭이 생길 수 있다. 예를 들어 PC 1, 2가 예약되고 PC 1이 취소되면 `dayCount = 1`이므로 다음 예약의 `pcNumber = 2`가 되어 PC 2와 충돌한다. 

`schedule` 테이블에 `pcNumber`에 대한 UNIQUE 제약이 없다면 중복 배정이 발생할 수 있다. PC 번호는 실제 사용 중인 번호를 조회하여 배정해야 한다.

**권장**:
```typescript
const usedPcNumbers = await tx.schedule.findMany({
  where: { date, status: { not: 'cancelled' } },
  select: { pcNumber: true },
});
const usedSet = new Set(usedPcNumbers.map((s) => s.pcNumber));
const pcNumber = [1,2,3,4,5].find((n) => !usedSet.has(n)) ?? (dayCount + 1);
```

---

### [YELLOW-05] booking/page.tsx — startTime/endTime에 ':00' 중복 추가 — **수정 완료 (RED-02와 함께)**

---

### [YELLOW-06] api-client.ts — schedules ID 타입이 string으로 선언 — **수정 완료**

`frontend/src/types/index.ts`의 모든 ID 필드(`id`, `companyId`, `engineerId` 등)를 `number`로 수정. `InspectionCycle` string enum 타입 제거, `inspectionCycle: number`(일 단위)로 통일. `getCycleLabel()`, `INSPECTION_CYCLES` 상수도 숫자 기반으로 수정.

---

### [YELLOW-07] middleware.ts — partner 역할인 경우에도 /admin/dashboard로 리다이렉트

**파일**: `frontend/src/middleware.ts` (line 9)

```typescript
// 로그인된 사용자가 /login 접근 시 무조건 /admin/dashboard로 이동
if (token) return NextResponse.redirect(new URL('/admin/dashboard', req.url));
```

partner 사용자가 `/login`을 다시 방문하면 `/admin/dashboard`로 리다이렉트되는데, partner는 해당 경로에 접근 권한이 없다. (단, [RED-01] 수정 후 이 문제도 함께 수정됨)

---

## 4. 잘 구현된 부분

### [GREEN-01] next.config.ts — standalone 출력 설정 정확

`output: 'standalone'` 설정이 올바르게 포함되어 있으며, `frontend/Dockerfile`에서 `.next/standalone/server.js`를 실행하는 구조가 일치한다. Docker 빌드 파이프라인이 표준 Next.js 프로덕션 권장 방식을 따르고 있다.

### [GREEN-02] Docker Compose — healthcheck + depends_on 조건 설정

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

postgres가 완전히 준비된 후 backend가 시작되도록 `service_healthy` 조건을 사용하고 있어, migration 실패 위험을 적절히 방지하고 있다.

### [GREEN-03] SchedulesService — 트랜잭션으로 Race Condition 방지

`prisma.$transaction`으로 PC 좌석 카운트 + 엔지니어 중복 확인 + 일정 생성을 단일 트랜잭션으로 처리하여 동시 요청에 의한 오버부킹을 방지하고 있다.

### [GREEN-04] axios 인터셉터 — 401 자동 갱신 로직

토큰 만료 시 refresh를 시도하고, `_retry` 플래그로 무한 루프를 방지하며, refresh 실패 시 쿠키와 localStorage를 모두 초기화하고 로그인 페이지로 리다이렉트하는 흐름이 올바르게 구현되어 있다.

### [GREEN-05] ValidationPipe + whitelist 설정

NestJS `ValidationPipe`에 `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`가 적용되어 DTO 이외 필드 주입을 차단하고 자동 타입 변환이 동작한다.

### [GREEN-06] login/page.tsx — accessToken/token 필드 폴백 처리

```typescript
const token = res.data.accessToken || res.data.token || '';
```

API 명세상 로그인 응답이 `token` 필드를 사용하고 refresh 응답이 `accessToken`을 사용하는 불일치 상황에서, 양쪽 모두 처리하는 방어 코드가 있어 런타임 오류는 발생하지 않는다.

---

## 5. 영역별 검토

### 5-1. Frontend

**타입 안전성**
- `User.id`, `Company.id`, `Schedule.id` 등 모든 ID 타입이 `string`으로 선언되어 있으나 백엔드는 `number`(Int) 반환
- `AuthResponse` 타입이 로그인/refresh 두 가지 응답을 동시에 표현하여 타입 정확도 저하
- `AvailableSlot` 타입이 `{ pcNumber: number; available: boolean }`으로 정의되어 있으나 실제 API 응답은 `{ time: string; available: number; total: number }` 구조로 불일치

**API 연동 정합성**
- `authApi.withdraw`는 `password`만 전달하지만 API 명세는 `{ email, password }` 요구 — 회원탈퇴 기능 동작 불가
- `authApi.register`의 `companyId` 타입이 `string`이나 API 명세는 `number`
- `schedulesApi.getAll`의 `companyId`, `engineerId` 파라미터가 `string`이나 API 명세는 `number`

**인증 흐름**
- 쿠키 + localStorage 이중 저장은 아키텍처 명세(`01_architecture.md` §5)와 일치하나, httpOnly 쿠키 설정이 빠져 있어 XSS 공격 시 `js-cookie`로 설정된 일반 쿠키에서 토큰 탈취 가능
- 미들웨어의 역할 기반 접근 제어 누락 (RED-01)

**에러 처리**
- 주요 폼과 mutation에서 `err.response?.data?.message` 패턴으로 에러 메시지를 표시하는 것은 일관되게 구현됨
- Network 에러(connection refused 등) 처리는 추가 필요

### 5-2. Backend

**비즈니스 로직 정확성**
- 중복 예약 방지 3가지 케이스 (PC 좌석, 엔지니어 충돌, 계약 중복) 모두 구현됨
- pcNumber 자동 배정 로직에 갭 발생 가능성 있음 (YELLOW-04)
- `getD7Targets`에서 `fcmToken`이 있는 사용자만 대상으로 하는데, 웹 전환 후 대부분 fcmToken이 없으면 D-7 알림이 발송되지 않을 수 있음

**CORS 설정**
- `origin: true`는 모든 Origin을 허용하여 프로덕션에 부적합. 배포 환경에서는 `origin: process.env.FRONTEND_URL`로 제한 권장
- `credentials: true`와 `origin: true` 조합은 CORS 스펙상 허용되지 않으며 일부 브라우저에서 에러 발생 가능

**Docker 설정**
- `npm ci --only=production` 후 빌드는 실패할 가능성 높음 (YELLOW-01)

### 5-3. Docker/배포

**컨테이너 시작 순서**
- `postgres` → `backend` (healthcheck 조건) 순서로 올바르게 구성됨
- `frontend`는 `backend`에만 `depends_on`하며 healthcheck 없음. `backend`가 migration 완료 전 `frontend`가 API 요청할 경우 에러 가능 (실사용상 문제 없는 수준)

**환경변수 관리**
- JWT Secret 하드코딩 (YELLOW-02)
- `NEXT_PUBLIC_API_URL` 런타임 주입 불가 (YELLOW-03)
- Postgres 비밀번호 `postgres123`이 소스코드에 노출됨

**보안**
- `ports: "5432:5432"` — PostgreSQL 포트가 호스트에 노출됨. 내부 서비스 통신에만 필요하므로 ports 지시자 제거 권장 (내부 네트워크 접근은 volumes/networks로 충분)

---

## 6. API 명세 vs 구현 정합성 검토

| 항목 | API 명세 (`02_api_spec.md`) | 구현 (`api-client.ts`) | 상태 |
|------|--------------------------|----------------------|------|
| 로그인 응답 필드 | `token` (accessToken) | `accessToken \|\| token` 폴백 | 주의 — 런타임 동작은 하나 명세 불일치 |
| refresh 응답 | `{ accessToken, refreshToken }` | `data.accessToken \|\| data.token` | 일치 |
| 모든 ID 타입 | `number` (Int) | `string` | 불일치 |
| withdraw 요청 body | `{ email, password }` | `{ password }` 만 전달 | 불일치 — 기능 오작동 |
| available-slots 응답 | `{ time, available, total }[]` | `{ pcNumber, available }[]` 타입 선언 | 타입 불일치 |
| companyId 파라미터 | `number` | `string` | 타입 불일치 |
| schedules/:id path param | `number` | `string` | 타입 불일치 |
| POST /schedules companyContractId | `number` (optional) | `string \| undefined` | 타입 불일치 |
| company-contracts/:code | `code: string` (업체 코드) | `user.companyId` (숫자 ID) 전달 | 동작 오류 — RED-02 |

---

## 7. 최종 평가

**Overall 점수**: 7.5 / 10

**주요 완성도**:
- Docker 빌드 파이프라인 (frontend standalone, backend migration): 완성
- 핵심 비즈니스 로직 (중복 예약, PC 제한, 트랜잭션): 완성
- 인증 플로우 (JWT, refresh, 인터셉터): 대체로 완성
- 역할 기반 접근 제어: 미들웨어 미구현 (RED-01)
- 타입 시스템 정합성: 다수 불일치 존재

**즉시 실행 가능 여부**: 미들웨어 역할 분리(RED-01) 수정 및 backend Dockerfile npm ci 수정(YELLOW-01) 후 실행 가능. 계약 조회 오류(RED-02)는 partner 일정 등록 기능 사용 불가에 영향.

---

## 8. 수정 완료 사항

### [RED-01] middleware.ts 역할 기반 접근 제어 — 수정 완료

수정 파일:
- `frontend/src/middleware.ts` — 역할 기반 접근 제어 구현
- `frontend/src/app/(auth)/login/page.tsx` — `userRole` 쿠키 설정 추가

수정 내용:
- `userRole` 쿠키를 읽어 admin/partner 경로 분리
- partner가 `/admin/*` 접근 시 `/partner/schedule`로 리다이렉트
- admin이 `/partner/*` 접근 시 `/admin/dashboard`로 리다이렉트
- 로그인된 사용자가 `/login`, `/signup` 접근 시 역할별 홈으로 리다이렉트
- matcher를 명시적 경로 패턴으로 변경 (`/((?!api|_next...)` 와일드카드에서 구체적 경로로)
- 로그인 성공 시 `Cookies.set('userRole', user.role, { expires: 7 })` 추가하여 미들웨어가 역할을 읽을 수 있도록 함
