# 04. 테스트 계획

## 1. 테스트 전략 개요

### 목표
- 전체 코드 커버리지: 80% 이상
- 핵심 비즈니스 로직(중복 예약 방지, PC 좌석 제한, JWT 인증): 100% 커버
- 배포 전 회귀 방지를 위한 자동화 테스트 파이프라인 확보

### 범위
- Backend: SchedulesService, AuthService, 핵심 도메인 로직
- Frontend: authStore, API 클라이언트 인터셉터, 유틸리티 함수
- Integration: 인증 플로우, 일정 CRUD API 엔드포인트
- E2E: 관리자/협력사 핵심 사용자 플로우

### 테스트 유형별 커버리지 목표

| 레벨 | 비율 | 도구 | 목표 커버리지 |
|------|------|------|------------|
| 단위 (Unit) | 70% | Vitest (FE), Jest (BE) | 비즈니스 로직 100% |
| 통합 (Integration) | 20% | Supertest + Jest | API 핵심 경로 100% |
| E2E | 10% | Playwright | 핵심 플로우 4개 |

---

## 2. 단위 테스트 (Unit Tests)

### 2-1. Frontend (Vitest)

#### utils 함수 테스트

파일: `src/lib/utils.ts` (추정 경로)

| # | 테스트 케이스 | 입력 | 기대 출력 |
|---|------------|------|---------|
| U-F-01 | formatDate — 정상 날짜 | `"2026-05-26"` | `"2026년 5월 26일"` 형식 문자열 |
| U-F-02 | formatDate — null/undefined | `null` | `""` 또는 `"—"` |
| U-F-03 | getStatusColor — pending | `"pending"` | 노란색 계열 클래스 문자열 |
| U-F-04 | getStatusColor — completed | `"completed"` | 초록색 계열 클래스 문자열 |
| U-F-05 | getStatusColor — cancelled | `"cancelled"` | 빨간색 계열 클래스 문자열 |
| U-F-06 | cn (class-names merger) | `"px-4", undefined, "py-2"` | `"px-4 py-2"` |
| U-F-07 | cn — 조건부 클래스 | `{ 'font-bold': true, 'italic': false }` | `"font-bold"` |

```typescript
// 예시 테스트 코드 (Vitest)
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (class merger)', () => {
  it('truthy 조건 클래스만 병합한다', () => {
    // Arrange
    const condition = true;
    // Act
    const result = cn('base', { 'extra': condition, 'excluded': false });
    // Assert
    expect(result).toBe('base extra');
  });
});
```

#### authStore Zustand 스토어 테스트

파일: `src/stores/authStore.ts`

| # | 테스트 케이스 | 시나리오 | 기대 결과 |
|---|------------|---------|---------|
| U-F-08 | 초기 상태 | 스토어 생성 직후 | `user: null` |
| U-F-09 | setUser | 유효 User 객체 전달 | `user`가 해당 객체로 설정 |
| U-F-10 | logout | 호출 후 | `user: null`, 쿠키 제거, localStorage 초기화 |
| U-F-11 | persist hydration | SSR 환경 (`window === undefined`) | 에러 없이 null 반환 |
| U-F-12 | setUser(null) | null 전달 | `user: null` 유지 |

```typescript
// 예시 테스트 코드 (Vitest)
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/stores/authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('로그아웃 시 user가 null이 된다', () => {
    // Arrange
    const mockUser = { id: '1', name: '홍길동', email: 'a@a.com', role: 'admin' as const, companyId: null, isDeleted: false };
    useAuthStore.setState({ user: mockUser });
    // Act
    act(() => useAuthStore.getState().logout());
    // Assert
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

#### API 클라이언트 인터셉터 테스트

파일: `src/lib/api.ts`

| # | 테스트 케이스 | 시나리오 | 기대 결과 |
|---|------------|---------|---------|
| U-F-13 | 요청 인터셉터 — 토큰 있음 | 쿠키에 accessToken 존재 | `Authorization: Bearer {token}` 헤더 첨부 |
| U-F-14 | 요청 인터셉터 — 토큰 없음 | 쿠키 비어있음 | Authorization 헤더 없음 |
| U-F-15 | 응답 인터셉터 — 401 처리 | 401 응답 + refresh 성공 | 새 토큰으로 원래 요청 재시도 |
| U-F-16 | 응답 인터셉터 — refresh 실패 | 401 응답 + refresh도 401 | `/login` 리다이렉트 |
| U-F-17 | 응답 인터셉터 — 무한루프 방지 | `_retry: true` 이미 설정된 요청 | 재시도 없이 에러 throw |

```typescript
// 예시 테스트 코드 (Vitest + vi.mock)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@/lib/api';

describe('API 인터셉터 — 401 토큰 갱신', () => {
  it('refresh 성공 시 원래 요청을 재시도한다', async () => {
    // Arrange
    const mock = new MockAdapter(api);
    mock.onGet('/schedules').replyOnce(401).onGet('/schedules').reply(200, []);
    mock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token' });
    // Act & Assert
    const result = await api.get('/schedules');
    expect(result.status).toBe(200);
  });
});
```

---

### 2-2. Backend (Jest)

#### SchedulesService — 중복 예약 검증 로직

파일: `src/schedules/schedules.service.ts`

| # | 테스트 케이스 | 입력 조건 | 기대 결과 |
|---|------------|---------|---------|
| U-B-01 | 정상 일정 생성 | 빈 날짜, 유효 업체/엔지니어 | schedule 객체 반환 |
| U-B-02 | PC 좌석 마감 | 당일 예약 수 = globalMaxPc | `ConflictException("해당 날짜의 PC 예약이 마감되었습니다.")` |
| U-B-03 | 엔지니어 중복 | 동일 engineerId + date + startTime 존재 | `ConflictException("해당 엔지니어는 같은 시간대에 이미 일정이 있습니다.")` |
| U-B-04 | 업체+계약 중복 | 동일 companyId + companyContractId + date | `ConflictException("해당 계약은 같은 날짜에 이미 일정이 등록되어 있습니다.")` |
| U-B-05 | 파트너 타업체 예약 | partner role + 다른 companyId | `ForbiddenException("본인 업체의 일정만 등록할 수 있습니다.")` |
| U-B-06 | pcNumber 자동 배정 | 당일 기존 예약 3건 | pcNumber = 4 |
| U-B-07 | cancelled 예약 무시 | 당일 cancelled 2건 + active 1건 | dayCount = 1, pcNumber = 2 |
| U-B-08 | SystemSetting 없을 때 기본값 | pcSetting = null | globalMaxPc = 5 (기본값) |

```typescript
// 예시 테스트 코드 (Jest + Prisma mock)
describe('SchedulesService.create', () => {
  it('PC 좌석이 마감된 날짜에 예약하면 ConflictException을 던진다', async () => {
    // Arrange
    const prismaMock = {
      $transaction: jest.fn((fn) => fn(prismaMock)),
      company: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      systemSettingHistory: { findFirst: jest.fn().mockResolvedValue({ value: '5' }) },
      schedule: { count: jest.fn().mockResolvedValue(5) },
    };
    const service = new SchedulesService(prismaMock as any);
    const dto: CreateScheduleDto = { companyId: 1, engineerId: 1, date: '2026-06-01', startTime: '09:00', endTime: '10:00' };
    // Act & Assert
    await expect(service.create(dto, { role: 'admin', companyId: 0 }))
      .rejects.toThrow(ConflictException);
  });
});
```

#### SchedulesService — PC 좌석 제한 및 가용 슬롯

| # | 테스트 케이스 | 입력 | 기대 결과 |
|---|------------|------|---------|
| U-B-09 | getAvailableSlots — 빈 날짜 | date: "2026-07-01", 예약 0건 | 7개 슬롯 모두 available = maxPcCount |
| U-B-10 | getAvailableSlots — 특정 시간 마감 | 09:00에 5건 예약 | 09:00 available = 0, 나머지 = 5 |
| U-B-11 | getAvailableSlots — 취소 제외 | 09:00에 cancelled 3건 | available = maxPcCount (cancelled 무시) |

#### AuthService — JWT 생성/검증

| # | 테스트 케이스 | 입력 | 기대 결과 |
|---|------------|------|---------|
| U-B-12 | 정상 로그인 | 유효 email + password | `{ token, refreshToken, user }` 반환 |
| U-B-13 | 잘못된 비밀번호 | 유효 email + 틀린 password | `UnauthorizedException` |
| U-B-14 | 탈퇴한 계정 로그인 | isDeleted=true 계정 | `UnauthorizedException("탈퇴한 계정입니다.")` |
| U-B-15 | refresh 토큰 갱신 | 유효 refreshToken | `{ accessToken, refreshToken }` 반환 |
| U-B-16 | 만료된 refresh 토큰 | 기간 초과 토큰 | `UnauthorizedException` |
| U-B-17 | accessToken 필드명 | 로그인 성공 응답 | 응답 키가 `token` (API 명세 기준) |

---

## 3. 통합 테스트 (Integration Tests)

### 3-1. API 엔드포인트 테스트 (Supertest + Jest)

테스트 환경: 별도 테스트용 PostgreSQL 인스턴스 또는 `jest-prisma` 트랜잭션 롤백 방식 사용

#### 인증 플로우

| # | 시나리오 | 요청 | 기대 응답 |
|---|---------|------|---------|
| I-01 | 정상 로그인 | `POST /auth/login { email, password }` | 200 + `{ token, refreshToken, user }` |
| I-02 | 잘못된 자격증명 | `POST /auth/login { 틀린 password }` | 401 |
| I-03 | 토큰으로 보호 엔드포인트 접근 | `GET /schedules` + `Authorization: Bearer {token}` | 200 |
| I-04 | 토큰 없이 보호 엔드포인트 접근 | `GET /schedules` (헤더 없음) | 401 |
| I-05 | 토큰 갱신 | `POST /auth/refresh { refreshToken }` | 200 + `{ accessToken, refreshToken }` |
| I-06 | 만료된 refresh 토큰 | `POST /auth/refresh { 만료된 토큰 }` | 401 |
| I-07 | admin 전용 엔드포인트 — partner 접근 | `GET /companies/unregistered` + partner 토큰 | 403 |

#### 일정 CRUD

| # | 시나리오 | 요청 | 기대 응답 |
|---|---------|------|---------|
| I-08 | 일정 등록 | `POST /schedules` + 유효 DTO | 201 + ScheduleItem |
| I-09 | 일정 목록 조회 | `GET /schedules?year=2026&month=5` | 200 + ScheduleItem[] |
| I-10 | 일정 상세 조회 | `GET /schedules/1` | 200 + ScheduleDetail |
| I-11 | 일정 수정 | `PUT /schedules/1 { status: "confirmed" }` | 200 + 수정된 ScheduleItem |
| I-12 | 일정 삭제 | `DELETE /schedules/1` | 200 + 삭제된 ScheduleItem |
| I-13 | 없는 일정 조회 | `GET /schedules/99999` | 404 |

#### 비즈니스 규칙 경계값 테스트

| # | 시나리오 | 요청 | 기대 응답 |
|---|---------|------|---------|
| I-14 | 중복 엔지니어 예약 | 동일 engineerId + date + startTime으로 2번 등록 | 두 번째 요청: 409 (`"해당 엔지니어는 같은 시간대에 이미 일정이 있습니다."`) |
| I-15 | PC 좌석 초과 | 당일 globalMaxPc(5)건 등록 후 추가 시도 | 409 (`"해당 날짜의 PC 예약이 마감되었습니다."`) |
| I-16 | 동일 업체+계약 중복 | 동일 companyId + companyContractId + date | 409 (`"해당 계약은 같은 날짜에 이미 일정이 등록되어 있습니다."`) |
| I-17 | 파트너 타업체 예약 시도 | partner가 다른 companyId로 POST | 403 |
| I-18 | cancelled 이후 재예약 | 동일 슬롯 취소 후 새 예약 | 201 (성공) |

#### 가용 슬롯 조회

| # | 시나리오 | 요청 | 기대 응답 |
|---|---------|------|---------|
| I-19 | 빈 날짜 슬롯 조회 | `GET /schedules/available-slots?date=2026-12-01` | 200 + 7개 슬롯, 모두 available = total |
| I-20 | 일부 예약된 날짜 | 09:00에 2건 등록 후 슬롯 조회 | 09:00 슬롯의 available = total - 2 |

---

## 4. E2E 테스트 (Playwright)

### 사전 조건
- `http://localhost:3000` 프론트엔드 실행 중
- `http://localhost:3001` 백엔드 실행 중
- 테스트 픽스처: admin 계정 `admin@test.com / admin1234`, partner 계정 `partner@test.com / partner1234`

### 4-1. 관리자 플로우

#### E2E-01: 로그인 → 대시보드 KPI 확인

```
1. /login 페이지 접속
2. 이메일: admin@test.com, 비밀번호: admin1234 입력
3. 로그인 버튼 클릭
4. /admin/dashboard 리다이렉트 확인
5. KPI 카드 3개 (오늘 방문, 미예약 업체, 이달 완료율) 렌더링 확인
6. 연간 진행도 차트 가시성 확인
```

기대 결과: 대시보드가 에러 없이 로드되고, KPI 카드에 숫자가 표시됨

#### E2E-02: 일정 상태 변경

```
1. admin 로그인
2. /admin/schedule 페이지 이동
3. 기존 일정 행 클릭
4. 상태 변경 버튼 (pending → confirmed) 클릭
5. 토스트 알림 "상태가 변경되었습니다" 확인
6. 해당 행의 상태 배지가 "confirmed"로 업데이트 확인
```

#### E2E-03: 업체 추가 → 일정 조회

```
1. admin 로그인
2. /admin/companies 이동
3. "업체 추가" 버튼 클릭
4. 업체명: "테스트업체E2E", 코드: "C099", 점검주기 입력
5. 저장 확인
6. 업체 목록에 "테스트업체E2E" 표시 확인
7. /admin/schedule에서 해당 업체 필터 적용 후 결과 확인
```

### 4-2. 협력사 플로우

#### E2E-04: 로그인 → 일정 등록 마법사 4단계 완료

```
1. /login 접속, partner@test.com / partner1234 로그인
2. /partner/schedule 리다이렉트 확인
3. "일정 등록" 버튼 또는 /partner/booking 이동
4. [Step 1 — 날짜/계약 선택]
   - 시작일 선택 (오늘 + 7일)
   - 계약 선택 (있는 경우)
   - "다음" 클릭
5. [Step 2 — 시간 입력]
   - 시작 시간 "09:00" 입력
   - 종료 시간 "10:00" 입력
   - "다음" 클릭
6. [Step 3 — PC 배정]
   - "자동 PC 배정" 체크 확인
   - "다음" 클릭
7. [Step 4 — 확인]
   - 입력 내용 표시 확인
   - "일정 등록" 버튼 클릭
8. 토스트 "일정이 등록되었습니다" 확인
9. /partner/schedule 리다이렉트 확인
10. 새 일정이 캘린더/타임라인에 표시 확인
```

#### E2E-05: 알림 확인 → 읽음 처리

```
1. partner 로그인
2. 헤더 알림 벨 아이콘에 미읽음 뱃지 표시 확인
3. /notifications 이동
4. 알림 목록 표시 확인
5. 첫 번째 알림 클릭 → 읽음 처리 확인 (배경색 변경)
6. "모두 읽음" 버튼 클릭
7. 모든 알림 읽음 상태 확인
8. 헤더 알림 뱃지 제거 확인 (30초 폴링 또는 즉시)
```

---

## 5. 수동 테스트 체크리스트 (Smoke Test)

### 인증

- [ ] 정상 로그인 (admin/partner 각각)
- [ ] 잘못된 비밀번호 → 에러 메시지 표시
- [ ] 로그인 상태에서 `/login` 접속 → 역할별 홈으로 리다이렉트
- [ ] 비로그인 상태에서 `/admin/dashboard` 접속 → `/login` 리다이렉트
- [ ] partner가 `/admin/dashboard` 접속 → `/partner/schedule` 리다이렉트
- [ ] 로그아웃 후 보호 경로 접근 → `/login` 리다이렉트

### 일정 관리

- [ ] 관리자 — 캘린더에 일정 도트 표시
- [ ] 관리자 — 날짜 클릭 → 해당 날짜 일정 필터링
- [ ] 파트너 — 본인 업체 일정만 표시 확인
- [ ] 일정 등록 마법사 4단계 정상 완료
- [ ] 중복 시간대 등록 시 에러 메시지 표시

### 비즈니스 로직

- [ ] PC 슬롯 5대 중 5대 예약 후 추가 시도 → 에러
- [ ] 가용 슬롯 그리드에서 0인 시간대 비활성화 표시
- [ ] 다일 점검 (종료일 입력 시) 등록 및 조회

### 엑셀/설정

- [ ] 관리자 — 엑셀 다운로드 (year 필터만) → .xlsx 파일 저장
- [ ] 관리자 — 설정 페이지에서 PC 대수 변경 → 저장 성공

### 알림

- [ ] 30초 폴링으로 헤더 미읽음 카운트 자동 갱신 확인
- [ ] 개별 알림 읽음 처리
- [ ] 모두 읽음 처리

---

## 6. 성능 테스트 기준

| API 엔드포인트 | P50 목표 | P95 목표 | P99 목표 |
|-------------|---------|---------|---------|
| `POST /auth/login` | < 200ms | < 500ms | < 1000ms |
| `GET /schedules` (월별 조회) | < 300ms | < 500ms | < 1000ms |
| `POST /schedules` (트랜잭션) | < 500ms | < 1000ms | < 2000ms |
| `GET /schedules/available-slots` | < 200ms | < 400ms | < 800ms |
| `GET /excel/export` (전체) | < 2000ms | < 5000ms | < 10000ms |
| `GET /notifications` | < 200ms | < 400ms | < 800ms |

### 부하 테스트 시나리오 (k6 또는 Artillery 권장)

- 동시 사용자 20명 기준 `GET /schedules` P95 < 500ms 유지
- `POST /schedules` 동시 10명 요청 시 Race Condition 없이 PC 좌석 제한 준수
- 30초 폴링 (`GET /notifications/unread-count`) 20명 동시 → DB 커넥션 풀 고갈 없음

### 데이터베이스 쿼리 최적화 기준

- `schedules` 테이블: (date, status) 복합 인덱스 확인
- `schedule.groupBy(startTime)`: 실행 계획에서 Seq Scan 없음 확인
- N+1 쿼리 없음 — Prisma `include` 사용 여부 확인
