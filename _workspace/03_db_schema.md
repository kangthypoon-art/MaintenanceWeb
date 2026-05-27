# 03. DB 스키마

---

## 1. ERD (Mermaid)

```mermaid
erDiagram
  companies {
    Int id PK
    String name
    String code UK
    Int inspectionCycle
    DateTime createdAt
    DateTime updatedAt
  }

  users {
    Int id PK
    Int companyId FK
    String name
    String email UK
    String password
    Role role
    String phone
    String fcmToken
    Boolean isDeleted
    DateTime deletedAt
    DateTime createdAt
    DateTime updatedAt
  }

  schedules {
    Int id PK
    Int companyId FK
    Int contractId FK
    Int companyContractId FK
    Int engineerId FK
    Date date
    Date endDate
    String startTime
    String endTime
    Int pcNumber
    ScheduleStatus status
    String memo
    DateTime createdAt
    DateTime updatedAt
  }

  contracts {
    Int id PK
    Int companyId FK
    String contractName
    String description
    Date startDate
    Date endDate
    Boolean isActive
    DateTime createdAt
    DateTime updatedAt
  }

  company_contracts {
    Int id PK
    String code FK
    Int seq
    String contractName
    String inspectionLocation
    DateTime createdAt
    DateTime updatedAt
  }

  reports {
    Int id PK
    Int scheduleId FK_UK
    String fileUrl
    DateTime createdAt
  }

  notifications {
    Int id PK
    Int userId FK
    String message
    String type
    Boolean isRead
    DateTime sentAt
  }

  system_setting_history {
    Int id PK
    String key
    String value
    String memo
    DateTime createdAt
  }

  companies ||--o{ users : "소속 엔지니어"
  companies ||--o{ schedules : "점검 대상"
  companies ||--o{ contracts : "계약"
  companies ||--o{ company_contracts : "현장 계약 (code FK)"

  users ||--o{ schedules : "담당 엔지니어"
  users ||--o{ notifications : "알림 수신"

  schedules ||--o| reports : "점검 보고서 (1:1)"
  schedules }o--|| contracts : "연관 계약"
  schedules }o--|| company_contracts : "현장 계약"

  company_contracts }o--|| companies : "업체 코드 참조"
```

---

## 2. 테이블별 상세

### companies (업체)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 업체 고유 ID |
| name | String | NOT NULL | 업체명 |
| code | String | UNIQUE, NOT NULL | 업체 식별 코드 (예: "C001") |
| inspectionCycle | Int | NOT NULL | 점검 주기 (일 단위, 예: 30=월간, 90=분기) |
| createdAt | DateTime | DEFAULT now() | 생성일시 |
| updatedAt | DateTime | AUTO-UPDATE | 수정일시 |

**비고**: `code`는 `company_contracts.code`의 외래키 참조 대상. 삭제 시 users, schedules, contracts, company_contracts Cascade 삭제.

---

### users (사용자)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 사용자 고유 ID |
| companyId | Int | FK(companies.id), NULLABLE | 소속 협력사 ID. admin은 null |
| name | String | NOT NULL | 이름 |
| email | String | UNIQUE, NOT NULL | 이메일 (로그인 아이디) |
| password | String | NOT NULL | bcrypt 해시 (salt rounds: 10) |
| role | Role | DEFAULT 'partner' | 역할 (admin / partner) |
| phone | String | NULLABLE | 전화번호 |
| fcmToken | String | NULLABLE | FCM/Web Push 토큰 |
| isDeleted | Boolean | DEFAULT false | 소프트 삭제 플래그 |
| deletedAt | DateTime | NULLABLE | 삭제 일시 |
| createdAt | DateTime | DEFAULT now() | 생성일시 |
| updatedAt | DateTime | AUTO-UPDATE | 수정일시 |

**비고**: 소프트 삭제 구조. `isDeleted=true`여도 레코드 유지. 재가입 시 isDeleted=false로 복원.

---

### schedules (점검 일정)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 일정 고유 ID |
| companyId | Int | FK(companies.id), NOT NULL | 점검 대상 업체 |
| contractId | Int | FK(contracts.id), NULLABLE | 연관 계약 |
| companyContractId | Int | FK(company_contracts.id), NULLABLE | 현장 계약 |
| engineerId | Int | FK(users.id), NOT NULL | 담당 엔지니어 |
| date | Date | NOT NULL | 점검 시작일 (YYYY-MM-DD) |
| endDate | Date | NULLABLE | 다일 점검 종료일 (없으면 당일만) |
| startTime | String | NOT NULL | 시작 시간 (HH:MM 형식) |
| endTime | String | NOT NULL | 종료 시간 (HH:MM 형식) |
| pcNumber | Int | NOT NULL | 배정된 PC 번호 (1~globalMaxPc) |
| status | ScheduleStatus | DEFAULT 'pending' | 상태 |
| memo | String | NULLABLE | 메모 |
| createdAt | DateTime | DEFAULT now() | 생성일시 |
| updatedAt | DateTime | AUTO-UPDATE | 수정일시 |

**Unique 제약**: `(engineerId, date, startTime)` — 동일 엔지니어가 같은 날짜+시간에 중복 등록 불가

---

### contracts (계약)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 계약 고유 ID |
| companyId | Int | FK(companies.id), NOT NULL | 업체 ID |
| contractName | String | NOT NULL | 계약명 |
| description | String | NULLABLE | 계약 설명 |
| startDate | Date | NULLABLE | 계약 시작일 |
| endDate | Date | NULLABLE | 계약 종료일 |
| isActive | Boolean | DEFAULT true | 활성 여부 |
| createdAt | DateTime | DEFAULT now() | 생성일시 |
| updatedAt | DateTime | AUTO-UPDATE | 수정일시 |

**비고**: 업체 삭제 시 Cascade 삭제. schedules.contractId가 참조함.

---

### company_contracts (현장 계약)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 현장 계약 고유 ID |
| code | String | FK(companies.code), NOT NULL | 업체 코드 (조인 키) |
| seq | Int | NOT NULL | 업체 내 순번 (자동 증가 관리) |
| contractName | String | NOT NULL | 현장 계약명 |
| inspectionLocation | String | NULLABLE | 점검 위치 (예: "1F 서버실") |
| createdAt | DateTime | DEFAULT now() | 생성일시 |
| updatedAt | DateTime | AUTO-UPDATE | 수정일시 |

**Unique 제약**: `(code, seq)` — 동일 업체 내 순번 중복 불가

**비고**: `code`는 companies.code를 참조. companies.id가 아닌 code를 FK로 사용하는 이유는 Flutter 앱 초기 설계 결정 사항. 업체 코드 변경 시 Cascade 업데이트.

---

### reports (점검 보고서)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 보고서 고유 ID |
| scheduleId | Int | FK(schedules.id), UNIQUE | 일정 ID (1:1 관계) |
| fileUrl | String | NOT NULL | 파일 경로 (로컬: /uploads/xxx.pdf, 프로덕션: S3 URL) |
| createdAt | DateTime | DEFAULT now() | 업로드 일시 |

**비고**: scheduleId에 UNIQUE 제약 → 일정당 보고서 1개만 허용.

---

### notifications (알림)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 알림 고유 ID |
| userId | Int | FK(users.id), NOT NULL | 수신 사용자 ID |
| message | String | NOT NULL | 알림 메시지 내용 |
| type | String | NOT NULL | 알림 유형 (아래 참조) |
| isRead | Boolean | DEFAULT false | 읽음 여부 |
| sentAt | DateTime | DEFAULT now() | 발송 일시 |

**type 값 정의**:
- `"d7_reminder"`: D-7 일정 미등록 알림 (매일 자정 Cron)
- `"schedule_confirmed"`: 일정 확정 알림
- `"unregistered_alert"`: 점검 주기 초과 미등록 경고

---

### system_setting_history (시스템 설정 이력)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | Int | PK, autoincrement | 이력 고유 ID |
| key | String | INDEX, NOT NULL | 설정 키 |
| value | String | NOT NULL | 설정값 (문자열) |
| memo | String | NULLABLE | 변경 사유 메모 |
| createdAt | DateTime | DEFAULT now() | 생성일시 |

**설계 특이사항**: UPDATE가 아닌 INSERT 방식으로 이력 관리. 현재값 조회 시 key로 groupBy 후 가장 최신 createdAt 레코드를 사용.

**사용되는 키 목록**:
| key | 기본값 | 설명 |
|-----|--------|------|
| `global_max_pc_count` | `"5"` | 일별 최대 예약 가능 PC 대수 |
| `inspection_start_time` | `"09:00"` | 점검 시작 가능 시간 |
| `inspection_end_time` | `"17:00"` | 점검 종료 시간 |
| `d7_alert_enabled` | `"true"` | D-7 알림 활성화 여부 |

---

## 3. Prisma Schema 전체

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  admin
  partner
}

enum ScheduleStatus {
  pending
  confirmed
  completed
  cancelled
}

model Company {
  id               Int               @id @default(autoincrement())
  name             String
  code             String            @unique
  inspectionCycle  Int               // 점검 주기 (일 단위)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  users            User[]
  schedules        Schedule[]
  contracts        Contract[]
  companyContracts CompanyContract[]

  @@map("companies")
}

model CompanyContract {
  id                 Int      @id @default(autoincrement())
  code               String                       // 업체 코드 (조인키)
  seq                Int                          // 순번 (업체별 자동증가)
  contractName       String                       // 계약명
  inspectionLocation String?                      // 점검위치
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  company   Company    @relation(fields: [code], references: [code], onDelete: Cascade)
  schedules Schedule[]

  @@unique([code, seq])
  @@map("company_contracts")
}

model Contract {
  id           Int      @id @default(autoincrement())
  companyId    Int
  contractName String
  description  String?
  startDate    DateTime? @db.Date
  endDate      DateTime? @db.Date
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company   Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  schedules Schedule[]

  @@map("contracts")
}

model User {
  id        Int       @id @default(autoincrement())
  companyId Int?
  name      String
  email     String    @unique
  password  String
  role      Role      @default(partner)
  phone     String?
  fcmToken  String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  company           Company?       @relation(fields: [companyId], references: [id])
  engineerSchedules Schedule[]     @relation("EngineerSchedules")
  notifications     Notification[]

  @@map("users")
}

model Schedule {
  id                Int            @id @default(autoincrement())
  companyId         Int
  contractId        Int?
  companyContractId Int?
  engineerId        Int
  date              DateTime       @db.Date
  endDate           DateTime?      @db.Date   // 종료일 (다일 점검 지원)
  startTime         String         // "HH:MM" 형식
  endTime           String         // "HH:MM" 형식
  pcNumber          Int
  status            ScheduleStatus @default(pending)
  memo              String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  company         Company          @relation(fields: [companyId], references: [id])
  contract        Contract?        @relation(fields: [contractId], references: [id])
  companyContract CompanyContract? @relation(fields: [companyContractId], references: [id])
  engineer        User             @relation("EngineerSchedules", fields: [engineerId], references: [id])
  report          Report?

  @@unique([engineerId, date, startTime])
  @@map("schedules")
}

model Report {
  id         Int      @id @default(autoincrement())
  scheduleId Int      @unique
  fileUrl    String   // S3 URL
  createdAt  DateTime @default(now())

  schedule Schedule @relation(fields: [scheduleId], references: [id])

  @@map("reports")
}

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  message   String
  type      String   // "d7_reminder" | "schedule_confirmed" | "unregistered_alert"
  isRead    Boolean  @default(false)
  sentAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("notifications")
}

model SystemSettingHistory {
  id        Int      @id @default(autoincrement())
  key       String
  value     String
  memo      String?
  createdAt DateTime @default(now())

  @@index([key])
  @@map("system_setting_history")
}
```

---

## 4. 인덱스 및 제약

### UNIQUE 제약

| 테이블 | 제약 대상 | 설명 |
|--------|---------|------|
| `companies` | `(code)` | 업체 코드 중복 방지 |
| `users` | `(email)` | 이메일 중복 방지 |
| `schedules` | `(engineerId, date, startTime)` | 동일 엔지니어 동시간대 중복 예약 방지 |
| `company_contracts` | `(code, seq)` | 업체별 계약 순번 중복 방지 |
| `reports` | `(scheduleId)` | 일정당 보고서 1개 제한 |

### 외래키 (FK) 및 Cascade 정책

| 자식 테이블 | FK 컬럼 | 참조 | Cascade 정책 |
|------------|---------|------|------------|
| `users` | `companyId` | `companies.id` | SET NULL (업체 삭제 시 사용자 유지) |
| `schedules` | `companyId` | `companies.id` | 제약 없음 (명시 안됨) |
| `schedules` | `engineerId` | `users.id` | 제약 없음 |
| `schedules` | `contractId` | `contracts.id` | 제약 없음 |
| `schedules` | `companyContractId` | `company_contracts.id` | 제약 없음 |
| `contracts` | `companyId` | `companies.id` | CASCADE DELETE |
| `company_contracts` | `code` | `companies.code` | CASCADE DELETE |
| `reports` | `scheduleId` | `schedules.id` | 제약 없음 |
| `notifications` | `userId` | `users.id` | 제약 없음 |

### 인덱스

| 테이블 | 인덱스 컬럼 | 용도 |
|--------|-----------|------|
| `system_setting_history` | `(key)` | 설정 키 빠른 조회 |
| `schedules` | `(engineerId, date, startTime)` | UNIQUE 인덱스 겸 조회 최적화 |
| `schedules` | `(companyId)` | 업체별 일정 조회 최적화 (Prisma FK 자동) |
| `schedules` | `(date)` | 날짜 범위 조회 최적화 (권장 추가) |
| `notifications` | `(userId, isRead)` | 사용자별 미읽음 알림 조회 최적화 (권장 추가) |
| `company_contracts` | `(code, seq)` | UNIQUE 인덱스 겸 조회 최적화 |

---

## 5. 시드 데이터 계획

시드 파일 위치: `backend/prisma/seed.ts`

### 시드 데이터 구성

#### admin 사용자 1명

```typescript
{
  email: 'admin@maintenance.com',
  password: bcrypt.hashSync('admin1234!', 10),
  name: '시스템 관리자',
  role: 'admin',
  companyId: null,
}
```

#### 협력사 업체 5개

```typescript
const companies = [
  { name: 'A산업 주식회사', code: 'C001', inspectionCycle: 30  },  // 월간
  { name: 'B전자 주식회사', code: 'C002', inspectionCycle: 90  },  // 분기
  { name: 'C기계 주식회사', code: 'C003', inspectionCycle: 90  },  // 분기
  { name: 'D화학 주식회사', code: 'C004', inspectionCycle: 180 },  // 반기
  { name: 'E물산 주식회사', code: 'C005', inspectionCycle: 365 },  // 연간
];
```

#### partner 사용자 3명 (각각 다른 업체 소속)

```typescript
const partners = [
  { email: 'eng1@maintenance.com', name: '김엔지니어', companyId: 1 },
  { email: 'eng2@maintenance.com', name: '이엔지니어', companyId: 2 },
  { email: 'eng3@maintenance.com', name: '박엔지니어', companyId: 3 },
];
// 비밀번호: partner1234! (공통)
```

#### 현장 계약 (company_contracts) 각 업체별 2~3개

```typescript
// C001 업체 현장 계약
{ code: 'C001', seq: 1, contractName: '1호기 정기점검', inspectionLocation: '1F 서버실' },
{ code: 'C001', seq: 2, contractName: '2호기 정기점검', inspectionLocation: '3F 전산실' },
// C002 업체 현장 계약
{ code: 'C002', seq: 1, contractName: '메인 서버 점검', inspectionLocation: 'B1 전산센터' },
```

#### 계약 (contracts) 10개 (업체별 1~2개)

```typescript
// 예시
{
  companyId: 1,
  contractName: '2026년 연간 유지보수 계약',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  isActive: true,
}
```

#### 시스템 설정 초기값

```typescript
const settings = [
  { key: 'global_max_pc_count', value: '5', memo: '초기 설정: 기본 PC 5대' },
  { key: 'inspection_start_time', value: '09:00', memo: '초기 설정' },
  { key: 'inspection_end_time', value: '17:00', memo: '초기 설정' },
  { key: 'd7_alert_enabled', value: 'true', memo: '초기 설정' },
];
```

### 시드 실행 명령

```bash
cd backend
npx prisma db seed
# 또는
npx ts-node prisma/seed.ts
```

---

## 6. 마이그레이션 전략

### 기존 마이그레이션 파일 목록 (12개)

| 순서 | 파일명 | 변경 내용 |
|------|--------|---------|
| 1 | `20260420130721_init` | 초기 스키마 (companies, users, schedules, reports, notifications) |
| 2 | `20260421013840_add_contracts` | contracts 테이블 추가 |
| 3 | `20260421020040_add_color_to_companies` | companies에 color 컬럼 추가 |
| 4 | `20260421030000_replace_color_with_contract_name` | color → contractName 컬럼 교체 |
| 5 | `20260421040000_add_inspection_type_to_companies` | inspectionType 컬럼 추가 |
| 6 | `20260421050000_rename_inspection_type_to_location` | inspectionType → inspectionLocation 컬럼명 변경 |
| 7 | `20260421060000_add_company_contracts_table` | company_contracts 테이블 추가 |
| 8 | `20260422000000_add_user_phone_deleted` | users에 phone, isDeleted, deletedAt 추가 |
| 9 | `20260422100000_add_company_contract_to_schedule` | schedules에 companyContractId FK 추가 |
| 10 | `20260424141306_add_system_settings` | system_setting_history 테이블 추가 |
| 11 | `20260424180000_remove_max_pc_count` | companies에서 maxPcCount 컬럼 제거 |
| 12 | `20260428054848_add_end_date_to_schedule` | schedules에 endDate 컬럼 추가 |

### Docker 환경에서 마이그레이션 적용 방법

**방법 1: docker-compose 시작 시 자동 마이그레이션 (권장)**

`docker-compose.yml` backend 서비스 command 설정:
```yaml
services:
  backend:
    command: sh -c "npx prisma migrate deploy && node dist/main"
```

**방법 2: 수동 마이그레이션 실행**
```bash
# backend 컨테이너에서 실행
docker exec -it maintenance_backend npx prisma migrate deploy
```

### 마이그레이션 시 주의사항

1. **기존 마이그레이션 파일 그대로 유지**: `C:\AIProjects\maintenance_app\backend\prisma\migrations\` 내 12개 파일을 `C:\AIProjects\WepApp\backend\prisma\migrations\`로 그대로 복사
2. **`prisma migrate deploy`**: 프로덕션/Docker 환경에서는 `migrate dev`가 아닌 `migrate deploy` 사용 (이미 생성된 마이그레이션을 순서대로 적용)
3. **`prisma migrate dev`**: 개발 환경에서 새 마이그레이션 생성 시에만 사용
4. **데이터 보존**: 기존 PostgreSQL 볼륨이 있는 경우 `_prisma_migrations` 테이블에서 이미 적용된 마이그레이션 기록 확인 후 중복 적용 방지

### 신규 마이그레이션 생성 시 (개발 중)

```bash
# 개발 환경 (컨테이너 외부)
cd backend
npx prisma migrate dev --name "add_new_feature"

# 마이그레이션 파일 생성 후 버전 관리에 추가
git add prisma/migrations/
```

### 현재 DB 상태 확인

```bash
# Prisma Studio로 DB 시각적 확인
npx prisma studio
# → http://localhost:5555

# 마이그레이션 상태 확인
npx prisma migrate status
```
