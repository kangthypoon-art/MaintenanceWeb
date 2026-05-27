# 00. 사용자 입력 정리

## 프로젝트 개요

**프로젝트명**: 유지보수 예방점검 일정 관리 시스템 (Maintenance Preventive Inspection Scheduler)
**마이그레이션**: Flutter Android App → 웹앱 (Next.js 14 + NestJS + PostgreSQL)
**소스 경로**: `C:\AIProjects\maintenance_app`
**타겟 경로**: `C:\AIProjects\WepApp`
**배포 방식**: Desktop Docker (docker-compose)
**기능 범위**: 100% 동일 기능 구현

---

## 기술 스택 결정

| 레이어 | 기존 (Flutter) | 신규 (Web) |
|--------|---------------|-----------|
| Frontend | Flutter (Dart) + Riverpod | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | NestJS (이미 완성) | NestJS 재사용 (Docker 컨테이너화) |
| Database | PostgreSQL + Prisma (이미 완성) | PostgreSQL 재사용 (Docker 컨테이너) |
| 상태관리 | Riverpod | Zustand + React Query (TanStack Query) |
| 인증 | JWT (access + refresh) | JWT 동일, 쿠키 기반으로 보완 |
| 배포 | APK / Flutter Web | docker-compose (3 서비스) |

---

## 사용자 역할 및 권한

| 역할 | 설명 | 접근 가능 화면 |
|------|------|--------------|
| **admin** | 시스템 전체 관리자 | 대시보드, 일정관리, 업체관리, 엑셀센터, 시스템설정 |
| **partner** | 협력사 엔지니어 | 내 일정 조회, 일정 등록(마법사) |

---

## DB 스키마 (8개 테이블)

### Enum
```sql
Role: admin | partner
ScheduleStatus: pending | confirmed | completed | cancelled
InspectionCycle: monthly | quarterly | semiAnnual | annual
```

### 테이블 목록
1. **companies**: id(UUID PK), name, code(UK), inspectionCycle, createdAt, updatedAt
2. **users**: id(UUID PK), email(UK), password(bcrypt), role, companyId(FK), name, phone, fcmToken, isDeleted, deletedAt
3. **schedules**: id(UUID PK), companyId(FK), engineerId(FK→users), companyContractId(FK nullable), date, endDate(nullable), startTime, endTime, status, pcNumber(1-5), createdAt, updatedAt
4. **reports**: id(UUID PK), scheduleId(FK-UK), fileUrl, createdAt
5. **contracts**: id(UUID PK), companyId(FK), contractName, description, startDate, endDate, isActive
6. **company_contracts**: id(Int PK), code(FK→companies.code), seq(Int), contractName, inspectionLocation, createdAt, updatedAt
7. **notifications**: id(UUID PK), userId(FK), message, type, isRead, sentAt
8. **system_setting_history**: id(UUID PK), key, value, memo, createdAt

### Unique 제약
- `schedules`: (engineerId, date, startTime) — 엔지니어 중복 예약 방지
- `company_contracts`: (code, seq) — 업체별 계약 순번 중복 방지

---

## API 엔드포인트 (40+개)

### /api/auth
- `POST /login` — JWT 로그인 → { accessToken, refreshToken, user }
- `POST /register` — 회원가입 (email, password, name, companyId)
- `POST /withdraw` — 회원탈퇴
- `GET /check-email?email=` — 이메일 중복 확인
- `GET /companies` — 회원가입용 협력사 목록
- `POST /refresh` — 액세스 토큰 갱신
- `POST /fcm-token` — FCM 토큰 등록

### /api/schedules
- `GET /` — 일정 목록 (쿼리: year, month, companyId, engineerId)
- `GET /:id` — 일정 상세
- `POST /` — 일정 등록
- `PUT /:id` — 일정 수정
- `DELETE /:id` — 일정 삭제
- `GET /available-slots?date=YYYY-MM-DD` — 가용 시간대 추천

### /api/companies
- `GET /` — 업체 목록
- `GET /:id` — 업체 상세 (계약 포함)
- `POST /` — 업체 생성 [admin]
- `PUT /:id` — 업체 수정 [admin]
- `DELETE /:id` — 업체 삭제 [admin]
- `GET /unregistered` — 미예약 업체 목록

### /api/users
- `GET /` — 사용자 목록 [admin]
- `GET /engineers` — 엔지니어 목록
- `POST /` — 사용자 생성 [admin]
- `PUT /:id` — 사용자 수정 [admin]
- `DELETE /:id` — 사용자 삭제 [admin]

### /api/contracts
- `GET /company/:companyId` — 업체별 계약 목록
- `POST /` — 계약 생성 [admin]
- `PUT /:id` — 계약 수정 [admin]
- `DELETE /:id` — 계약 삭제 [admin]

### /api/company-contracts
- `GET /:code` — 업체코드별 계약 목록
- `POST /:code` — 업체 계약 생성 [admin]
- `PUT /:id` — 업체 계약 수정 [admin]
- `DELETE /:id` — 업체 계약 삭제 [admin]

### /api/reports
- `POST /schedule/:scheduleId` — 보고서 업로드 (multipart)
- `GET /schedule/:scheduleId` — 보고서 조회
- `GET /schedule/:scheduleId/download` — 보고서 다운로드

### /api/notifications
- `GET /` — 알림 목록
- `GET /unread-count` — 미읽음 개수
- `PUT /:id/read` — 알림 읽음 처리
- `PUT /read-all` — 모두 읽음 처리

### /api/excel
- `GET /export` — 엑셀 파일 다운로드 (쿼리: year, month, companyId)

### /api/settings
- `GET /` — 모든 설정 조회
- `GET /:key` — 특정 설정 조회
- `PUT /:key` — 설정 업데이트 [admin]

---

## 화면 목록 (10개)

### 인증
1. **`/login`** — 이메일/비밀번호 로그인, role 기반 리다이렉트
2. **`/signup`** — 회원가입 (협력사 선택 드롭다운)

### 관리자 (admin only)
3. **`/admin/dashboard`** — 연간 진행도 차트, 업체별 완료율 바차트, 긴급업체 목록, KPI 카드 (오늘 방문, 미예약, 완료율)
4. **`/admin/schedule`** — 캘린더 + 날짜별 일정 테이블, 상태 변경, 삭제
5. **`/admin/companies`** — 업체 CRUD, 계약 관리, 일괄 점검주기 수정
6. **`/admin/excel`** — 연도/월/업체 필터 → xlsx 다운로드
7. **`/admin/settings`** — PC 대수, 점검 시간, D-7 알림 설정

### 협력사 (partner only)
8. **`/partner/schedule`** — 캘린더 + 파이차트 (계약별 진행도) + 타임라인 테이블
9. **`/partner/booking`** — 일정 등록 4단계 마법사

### 공통
10. **`/notifications`** — 알림 목록, 읽음/모두읽음 처리

---

## 핵심 비즈니스 로직

| 로직 | 설명 |
|------|------|
| 중복 예약 방지 | DB UNIQUE(engineerId, date, startTime) → 409 Conflict |
| PC 좌석 제한 | 기본 5대, SystemSetting `MAX_PC_COUNT`로 조정 |
| 자동 PC 배정 | `GET /available-slots` → 가용 PC 번호 추천 |
| 다일 점검 | Schedule.endDate로 범위 지원 |
| D-7 알림 | NestJS @Cron 매일 자정 실행, FCM 발송 |
| 역할 기반 접근 | JwtAuthGuard + RolesGuard + Next.js middleware |

---

## 배포 구성 (Docker Compose)

```
services:
  postgres: PostgreSQL 15 (포트 5432)
  backend:  NestJS API (포트 3001)
  frontend: Next.js 14 (포트 3000)

volumes:
  postgres_data (영구 저장)
  
networks:
  app-network (internal bridge)
```

---

## 가정 사항 (requirements 미명시 부분)

- FCM 토큰 관련 기능은 브라우저 Web Push로 대체 (선택적 구현)
- S3 파일 업로드는 로컬 스토리지(uploads 폴더)로 개발환경 대체
- 실시간 알림은 Polling 방식 (30초 간격) 으로 구현 (Socket.io는 선택적)
- 엑셀 파일은 백엔드에서 생성 후 스트림으로 반환
