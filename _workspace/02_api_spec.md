# 02. API 명세

---

## 기본 정보

- **Base URL**: `http://localhost:3001/api`
- **인증 방식**: Bearer Token (JWT Access Token, httpOnly 쿠키에서 자동 전송)
- **응답 형식**: `application/json`
- **ID 타입**: 모든 PK는 `number` (Int, autoincrement)
- **날짜 형식**: `YYYY-MM-DD` (문자열), DateTime은 ISO 8601
- **인증 표기**: `[인증 필요]` = JWT 토큰 필수, `[공개]` = 토큰 불필요, `[admin]` = admin 역할 필수

---

## 엔드포인트 목록

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | /auth/login | 로그인 | 공개 |
| POST | /auth/register | 회원가입 | 공개 |
| POST | /auth/withdraw | 회원탈퇴 | 공개 |
| GET | /auth/check-email | 이메일 중복 확인 | 공개 |
| GET | /auth/companies | 회원가입용 협력사 목록 | 공개 |
| POST | /auth/refresh | 액세스 토큰 갱신 | 공개 |
| POST | /auth/fcm-token | FCM 토큰 등록 | 인증 필요 |
| GET | /schedules | 일정 목록 조회 | 인증 필요 |
| GET | /schedules/available-slots | 가용 시간대 조회 | 인증 필요 |
| GET | /schedules/:id | 일정 상세 조회 | 인증 필요 |
| POST | /schedules | 일정 등록 | 인증 필요 |
| PUT | /schedules/:id | 일정 수정 | 인증 필요 |
| DELETE | /schedules/:id | 일정 삭제 | 인증 필요 |
| GET | /companies | 업체 목록 조회 | 인증 필요 |
| GET | /companies/next-code | 다음 업체 코드 조회 | admin |
| GET | /companies/unregistered | 미예약 업체 목록 | admin |
| GET | /companies/:id | 업체 상세 조회 | 인증 필요 |
| POST | /companies | 업체 등록 | admin |
| PUT | /companies/:id | 업체 수정 | admin |
| DELETE | /companies/:id | 업체 삭제 | admin |
| GET | /users | 사용자 목록 조회 | 인증 필요 |
| GET | /users/engineers | 엔지니어 목록 | admin |
| GET | /users/:id | 사용자 상세 조회 | 인증 필요 |
| POST | /users | 사용자 등록 | admin |
| PUT | /users/:id | 사용자 수정 | 인증 필요 |
| DELETE | /users/:id | 사용자 삭제 | admin |
| GET | /contracts/company/:companyId | 업체별 계약 목록 | 인증 필요 |
| GET | /contracts/:id | 계약 상세 조회 | 인증 필요 |
| POST | /contracts | 계약 등록 | admin |
| PUT | /contracts/:id | 계약 수정 | admin |
| DELETE | /contracts/:id | 계약 삭제 | admin |
| GET | /company-contracts/:code | 업체코드별 계약 목록 | 인증 필요 |
| POST | /company-contracts/:code | 업체 계약 등록 | 인증 필요 |
| PUT | /company-contracts/:id | 업체 계약 수정 | 인증 필요 |
| DELETE | /company-contracts/:id | 업체 계약 삭제 | 인증 필요 |
| POST | /reports/schedule/:scheduleId | 보고서 업로드 | 인증 필요 |
| GET | /reports/schedule/:scheduleId | 보고서 조회 | 인증 필요 |
| GET | /reports/schedule/:scheduleId/download | 보고서 다운로드 URL | 인증 필요 |
| GET | /notifications | 알림 목록 | 인증 필요 |
| GET | /notifications/unread-count | 미읽음 알림 수 | 인증 필요 |
| PUT | /notifications/:id/read | 알림 읽음 처리 | 인증 필요 |
| PUT | /notifications/read-all | 모두 읽음 처리 | 인증 필요 |
| GET | /excel/export | 일정 엑셀 다운로드 | admin |
| GET | /settings | 전체 설정 조회 | 인증 필요 |
| GET | /settings/:key | 특정 설정 조회 | 인증 필요 |
| PUT | /settings/:key | 설정 업데이트 | 인증 필요 |

---

## 상세 API

---

### 인증 (auth)

---

#### POST /auth/login

**설명**: 이메일/비밀번호로 로그인 후 JWT 반환

**인증**: 공개

**Headers**: `Content-Type: application/json`

**Request Body**:
```typescript
interface LoginDto {
  email: string;    // 이메일
  password: string; // 비밀번호
}
```

**Response 200**:
```typescript
interface LoginResponse {
  token: string;        // accessToken (1일 만료)
  refreshToken: string; // refreshToken (7일 만료)
  user: {
    id: string;         // 사용자 ID (숫자를 문자열로 반환)
    name: string;       // 이름
    role: 'admin' | 'partner';
    company_id: string | null; // 협력사 ID (파트너만 존재)
  };
}
```

**에러 코드**:
- `401`: 이메일 또는 비밀번호 불일치
- `401`: 탈퇴한 계정 (`"탈퇴한 계정입니다. 재가입 후 이용해 주세요."`)

---

#### POST /auth/register

**설명**: 신규 회원가입. 탈퇴 계정 이메일 재가입 지원.

**인증**: 공개

**Headers**: `Content-Type: application/json`

**Request Body**:
```typescript
interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;       // 전화번호 (선택)
  companyId?: number;   // 협력사 ID (partner는 필수 권장)
}
```

**Response 201**:
```typescript
interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  role: 'partner'; // 회원가입은 항상 partner 역할
}
```

**에러 코드**:
- `409`: 이미 사용 중인 이메일

---

#### POST /auth/withdraw

**설명**: 이메일+비밀번호 확인 후 소프트 삭제 (isDeleted=true)

**인증**: 공개

**Headers**: `Content-Type: application/json`

**Request Body**:
```typescript
interface WithdrawDto {
  email: string;
  password: string;
}
```

**Response 200**:
```typescript
{ message: '회원탈퇴가 완료되었습니다.' }
```

**에러 코드**:
- `400`: 이미 탈퇴한 계정
- `401`: 이메일 또는 비밀번호 불일치

---

#### GET /auth/check-email

**설명**: 이메일 중복 확인 (회원가입 전 실시간 검증용)

**인증**: 공개

**Query Parameters**:
```
email: string  (예: email=test@example.com)
```

**Response 200**:
```typescript
interface CheckEmailResponse {
  available: boolean;  // true = 사용 가능
  isDeleted: boolean;  // true = 탈퇴 계정 (재가입 가능 안내)
}
```

---

#### GET /auth/companies

**설명**: 회원가입 화면에서 협력사 선택용 목록 조회

**인증**: 공개

**Response 200**:
```typescript
interface CompanySimple {
  id: number;
  name: string;
  code: string;
}
type CompaniesResponse = CompanySimple[];
```

---

#### POST /auth/refresh

**설명**: refreshToken으로 새 accessToken 발급

**인증**: 공개

**Headers**: `Content-Type: application/json`

**Request Body**:
```typescript
interface RefreshTokenDto {
  refreshToken: string;
}
```

**Response 200**:
```typescript
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
```

**에러 코드**:
- `401`: 유효하지 않은 리프레시 토큰 (만료 또는 변조)

---

#### POST /auth/fcm-token

**설명**: 로그인 후 브라우저 Web Push 토큰 등록/갱신

**인증**: 인증 필요

**Headers**: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

**Request Body**:
```typescript
{ fcmToken: string }
```

**Response 200**:
```typescript
{ message: 'FCM 토큰이 업데이트되었습니다.' }
```

---

### 일정 관리 (schedules)

---

#### GET /schedules

**설명**: 일정 목록 조회. 파트너는 본인 업체 데이터만 반환됨.

**인증**: 인증 필요

**Query Parameters**:
```
year?: number        연도 필터 (예: 2026)
month?: number       월 필터 (1~12)
companyId?: number   업체 ID 필터 (admin만 유효)
engineerId?: number  엔지니어 ID 필터
```

**Response 200**:
```typescript
interface ScheduleItem {
  id: number;
  companyId: number;
  engineerId: number;
  contractId: number | null;
  companyContractId: number | null;
  date: string;         // "YYYY-MM-DD"
  endDate: string | null;
  startTime: string;    // "HH:MM"
  endTime: string;      // "HH:MM"
  pcNumber: number;     // 1~5
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  company: { name: string; code: string; };
  engineer: { name: string; };
  companyContract: {
    contractName: string;
    inspectionLocation: string | null;
    seq: number;
  } | null;
  report: { fileUrl: string; } | null;
}
type ScheduleListResponse = ScheduleItem[];
```

---

#### GET /schedules/available-slots

**설명**: 특정 날짜의 시간대별 가용 PC 슬롯 조회. 일정 등록 마법사 Step2에서 사용.

**인증**: 인증 필요

**Query Parameters**:
```
date: string  (필수, 형식: "YYYY-MM-DD", 예: 2026-06-01)
```

**Response 200**:
```typescript
interface SlotInfo {
  time: string;      // "HH:MM" (09:00, 10:00, 11:00, 13:00, 14:00, 15:00, 16:00)
  available: number; // 남은 PC 대수
  total: number;     // 전체 PC 대수 (global_max_pc_count 설정값)
}
type AvailableSlotsResponse = SlotInfo[];
```

**예시 응답**:
```json
[
  { "time": "09:00", "available": 3, "total": 5 },
  { "time": "10:00", "available": 0, "total": 5 },
  { "time": "11:00", "available": 5, "total": 5 }
]
```

---

#### GET /schedules/:id

**설명**: 일정 상세 조회

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**:
```typescript
interface ScheduleDetail extends ScheduleItem {
  company: Company;          // 전체 업체 정보
  engineer: {
    id: number;
    name: string;
    email: string;
  };
  report: {
    id: number;
    fileUrl: string;
    createdAt: string;
  } | null;
}
```

**에러 코드**:
- `404`: 일정을 찾을 수 없습니다

---

#### POST /schedules

**설명**: 일정 등록. 자동 중복 검증 및 pcNumber 자동 배정. 트랜잭션 처리.

**인증**: 인증 필요

**Headers**: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

**Request Body**:
```typescript
interface CreateScheduleDto {
  companyId: number;
  engineerId: number;
  date: string;              // "YYYY-MM-DD"
  endDate?: string;          // "YYYY-MM-DD" (다일 점검 종료일)
  startTime: string;         // "HH:MM"
  endTime: string;           // "HH:MM"
  companyContractId?: number; // 업체 계약 ID (선택)
  memo?: string;
}
```

**Response 201**:
```typescript
// ScheduleItem (company, engineer, companyContract 포함)
```

**에러 코드**:
- `403`: 본인 업체의 일정만 등록할 수 있습니다 (partner가 타 업체 등록 시도)
- `404`: 업체를 찾을 수 없습니다
- `409`: 해당 날짜의 PC 예약이 마감되었습니다. (N대 한도)
- `409`: 해당 엔지니어는 같은 시간대에 이미 일정이 있습니다
- `409`: 해당 계약은 같은 날짜에 이미 일정이 등록되어 있습니다

---

#### PUT /schedules/:id

**설명**: 일정 수정. 파트너는 본인 업체 일정만 수정 가능.

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Request Body**:
```typescript
interface UpdateScheduleDto {
  date?: string;
  endDate?: string | null;  // null 전송 시 다일 점검 취소
  startTime?: string;
  endTime?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  companyContractId?: number;
  memo?: string;
}
```

**Response 200**: 수정된 ScheduleItem

**에러 코드**:
- `403`: 본인 업체의 일정만 수정할 수 있습니다
- `404`: 일정을 찾을 수 없습니다

---

#### DELETE /schedules/:id

**설명**: 일정 삭제. 파트너는 본인 업체 일정만 삭제 가능.

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**: 삭제된 ScheduleItem

**에러 코드**:
- `403`: 본인 업체의 일정만 삭제할 수 있습니다
- `404`: 일정을 찾을 수 없습니다

---

### 업체 관리 (companies)

---

#### GET /companies

**설명**: 전체 업체 목록 조회

**인증**: 인증 필요

**Response 200**:
```typescript
interface Company {
  id: number;
  name: string;
  code: string;
  inspectionCycle: number;  // 점검 주기 (일 단위)
  createdAt: string;
  updatedAt: string;
}
type CompanyListResponse = Company[];
```

---

#### GET /companies/next-code

**설명**: 다음 업체 코드 자동 생성 (업체 등록 폼에서 미리 표시)

**인증**: admin

**Response 200**:
```typescript
{ nextCode: string }  // 예: "C006"
```

---

#### GET /companies/unregistered

**설명**: 점검 주기를 초과하여 미예약 상태인 업체 목록. 관리자 대시보드 긴급 업체 목록에 사용.

**인증**: admin

**Response 200**:
```typescript
type UnregisteredCompaniesResponse = Company[];
```

---

#### GET /companies/:id

**설명**: 업체 상세 조회 (계약 정보 포함)

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**:
```typescript
interface CompanyDetail extends Company {
  contracts: Contract[];
  companyContracts: CompanyContract[];
  users: UserSimple[];
}
```

**에러 코드**:
- `404`: 업체를 찾을 수 없습니다

---

#### POST /companies

**설명**: 업체 등록

**인증**: admin

**Request Body**:
```typescript
interface CreateCompanyDto {
  name: string;
  code: string;            // 고유 코드 (예: "C001")
  inspectionCycle: number; // 점검 주기 (일 단위, 예: 30, 90, 180, 365)
}
```

**Response 201**: 생성된 Company

**에러 코드**:
- `409`: 이미 존재하는 업체 코드

---

#### PUT /companies/:id

**설명**: 업체 정보 수정

**인증**: admin

**Path Parameters**: `id: number`

**Request Body**:
```typescript
interface UpdateCompanyDto {
  name?: string;
  inspectionCycle?: number;
}
```

**Response 200**: 수정된 Company

**에러 코드**:
- `404`: 업체를 찾을 수 없습니다

---

#### DELETE /companies/:id

**설명**: 업체 삭제 (Cascade: 연관 schedules, contracts, companyContracts 함께 삭제)

**인증**: admin

**Path Parameters**: `id: number`

**Response 200**: 삭제된 Company

**에러 코드**:
- `404`: 업체를 찾을 수 없습니다

---

### 사용자 관리 (users)

---

#### GET /users

**설명**: 사용자 목록 조회. 파트너는 본인 소속 업체 사용자만 반환.

**인증**: 인증 필요

**Response 200**:
```typescript
interface UserItem {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'partner';
  phone: string | null;
  companyId: number | null;
  isDeleted: boolean;
  createdAt: string;
}
type UserListResponse = UserItem[];
```

---

#### GET /users/engineers

**설명**: 일정 배정 가능한 엔지니어 목록 (isDeleted=false인 partner 사용자)

**인증**: admin

**Response 200**:
```typescript
interface EngineerItem {
  id: number;
  name: string;
  email: string;
  companyId: number | null;
}
type EngineersResponse = EngineerItem[];
```

---

#### GET /users/:id

**설명**: 사용자 상세 조회

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**: UserItem

**에러 코드**:
- `404`: 사용자를 찾을 수 없습니다

---

#### POST /users

**설명**: 관리자가 사용자 직접 등록

**인증**: admin

**Request Body**:
```typescript
interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'partner';
  phone?: string;
  companyId?: number;
}
```

**Response 201**: UserItem

**에러 코드**:
- `409`: 이미 사용 중인 이메일

---

#### PUT /users/:id

**설명**: 사용자 정보 수정. admin은 모든 사용자 수정 가능, partner는 본인만.

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Request Body**:
```typescript
interface UpdateUserDto {
  name?: string;
  phone?: string;
  companyId?: number;
  role?: 'admin' | 'partner'; // admin만 변경 가능
}
```

**Response 200**: UserItem

**에러 코드**:
- `403`: 본인 정보만 수정할 수 있습니다 (partner가 타인 수정 시도)
- `404`: 사용자를 찾을 수 없습니다

---

#### DELETE /users/:id

**설명**: 사용자 소프트 삭제 (isDeleted=true)

**인증**: admin

**Path Parameters**: `id: number`

**Response 200**: 삭제된 UserItem

---

### 계약 관리 (contracts)

---

#### GET /contracts/company/:companyId

**설명**: 업체별 계약(Contract) 목록 조회

**인증**: 인증 필요

**Path Parameters**: `companyId: number`

**Response 200**:
```typescript
interface Contract {
  id: number;
  companyId: number;
  contractName: string;
  description: string | null;
  startDate: string | null;  // "YYYY-MM-DD"
  endDate: string | null;    // "YYYY-MM-DD"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
type ContractListResponse = Contract[];
```

---

#### GET /contracts/:id

**설명**: 계약 상세 조회

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**: Contract

**에러 코드**:
- `404`: 계약을 찾을 수 없습니다

---

#### POST /contracts

**설명**: 계약 등록

**인증**: admin

**Request Body**:
```typescript
interface CreateContractDto {
  companyId: number;
  contractName: string;
  description?: string;
  startDate?: string;   // "YYYY-MM-DD"
  endDate?: string;     // "YYYY-MM-DD"
  isActive?: boolean;   // 기본값: true
}
```

**Response 201**: Contract

---

#### PUT /contracts/:id

**설명**: 계약 수정

**인증**: admin

**Path Parameters**: `id: number`

**Request Body**:
```typescript
interface UpdateContractDto {
  contractName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}
```

**Response 200**: Contract

**에러 코드**:
- `404`: 계약을 찾을 수 없습니다

---

#### DELETE /contracts/:id

**설명**: 계약 삭제

**인증**: admin

**Path Parameters**: `id: number`

**Response 200**: 삭제된 Contract

---

### 업체 계약 관리 (company-contracts)

> **주의**: `contracts`와 별도 테이블. `contracts`는 기간/활성화 정보 위주, `company_contracts`는 점검 위치(inspectionLocation) 기반 현장 계약 목록.

---

#### GET /company-contracts/:code

**설명**: 업체 코드(code)로 해당 업체의 현장 계약 목록 조회. 일정 등록 마법사 Step3에서 사용.

**인증**: 인증 필요

**Path Parameters**: `code: string` (업체 코드, 예: "C001")

**Response 200**:
```typescript
interface CompanyContract {
  id: number;
  code: string;
  seq: number;           // 업체별 순번
  contractName: string;
  inspectionLocation: string | null;
  createdAt: string;
  updatedAt: string;
}
type CompanyContractListResponse = CompanyContract[];
```

---

#### POST /company-contracts/:code

**설명**: 업체 코드에 현장 계약 등록

**인증**: 인증 필요

**Path Parameters**: `code: string`

**Request Body**:
```typescript
interface CreateCompanyContractDto {
  seq: number;
  contractName: string;
  inspectionLocation?: string;
}
```

**Response 201**: CompanyContract

**에러 코드**:
- `409`: 해당 업체의 seq가 이미 존재합니다 (UNIQUE(code, seq) 위반)

---

#### PUT /company-contracts/:id

**설명**: 현장 계약 수정

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Request Body**:
```typescript
interface UpdateCompanyContractDto {
  contractName?: string;
  inspectionLocation?: string;
}
```

**Response 200**: CompanyContract

**에러 코드**:
- `404`: 현장 계약을 찾을 수 없습니다

---

#### DELETE /company-contracts/:id

**설명**: 현장 계약 삭제

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**: 삭제된 CompanyContract

---

### 점검 리포트 (reports)

---

#### POST /reports/schedule/:scheduleId

**설명**: PDF 점검 보고서 업로드 (multipart/form-data)

**인증**: 인증 필요

**Path Parameters**: `scheduleId: number`

**Headers**: `Content-Type: multipart/form-data`

**Request Body** (form-data):
```
file: File  (PDF 파일, field name = "file")
```

**Response 201**:
```typescript
interface Report {
  id: number;
  scheduleId: number;
  fileUrl: string;  // 로컬: "/uploads/filename.pdf", 프로덕션: S3 URL
  createdAt: string;
}
```

**에러 코드**:
- `404`: 일정을 찾을 수 없습니다
- `409`: 이미 보고서가 존재합니다 (scheduleId UNIQUE 제약)

---

#### GET /reports/schedule/:scheduleId

**설명**: 일정의 보고서 정보 조회

**인증**: 인증 필요

**Path Parameters**: `scheduleId: number`

**Response 200**: Report 또는 `null` (보고서 없을 시)

---

#### GET /reports/schedule/:scheduleId/download

**설명**: 보고서 다운로드 URL 발급 (로컬 환경에서는 파일 직접 스트림 반환)

**인증**: 인증 필요

**Path Parameters**: `scheduleId: number`

**Response 200**:
```typescript
interface DownloadResponse {
  downloadUrl: string; // 로컬: 파일 경로, 프로덕션: S3 Presigned URL (1시간 유효)
}
```

**에러 코드**:
- `404`: 보고서를 찾을 수 없습니다

---

### 알림 (notifications)

---

#### GET /notifications

**설명**: 내 알림 목록 조회 (최근 50건, sentAt 역순)

**인증**: 인증 필요

**Response 200**:
```typescript
interface NotificationItem {
  id: number;
  userId: number;
  message: string;
  type: 'd7_reminder' | 'schedule_confirmed' | 'unregistered_alert';
  isRead: boolean;
  sentAt: string;  // ISO 8601
}
type NotificationsResponse = NotificationItem[];
```

---

#### GET /notifications/unread-count

**설명**: 읽지 않은 알림 수 조회. 헤더 뱃지 표시용 (30초 폴링).

**인증**: 인증 필요

**Response 200**:
```typescript
{ count: number }
```

---

#### PUT /notifications/:id/read

**설명**: 특정 알림 읽음 처리

**인증**: 인증 필요

**Path Parameters**: `id: number`

**Response 200**: 수정된 NotificationItem

**에러 코드**:
- `404`: 알림을 찾을 수 없습니다
- `403`: 본인의 알림만 읽음 처리할 수 있습니다

---

#### PUT /notifications/read-all

**설명**: 본인의 모든 미읽음 알림을 일괄 읽음 처리

**인증**: 인증 필요

**Response 200**:
```typescript
{ count: number }  // 처리된 알림 수
```

---

### 엑셀 익스포트 (excel)

---

#### GET /excel/export

**설명**: 일정 데이터를 xlsx 파일로 생성하여 스트림 반환. 미예약 업체 시트 포함.

**인증**: admin

**Query Parameters**:
```
year?: number      연도 필터 (없으면 전체)
month?: number     월 필터 (없으면 해당 연도 전체)
companyId?: number 업체 필터 (없으면 전체 업체)
```

**Response 200**:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="schedules_YYYY-MM.xlsx"
Body: binary (xlsx 파일 스트림)
```

**에러 코드**:
- `403`: admin 권한 필요

**프론트엔드 처리**:
```typescript
// axios로 blob 응답 처리
const response = await api.get('/excel/export', {
  params: { year, month, companyId },
  responseType: 'blob',
});
const url = URL.createObjectURL(new Blob([response.data]));
const a = document.createElement('a');
a.href = url;
a.download = `schedules_${year}-${month}.xlsx`;
a.click();
```

---

### 시스템 설정 (settings)

---

#### GET /settings

**설명**: 모든 설정 키의 현재값 조회 (각 키의 가장 최신 기록 반환)

**인증**: 인증 필요

**Response 200**:
```typescript
interface SettingCurrent {
  key: string;
  value: string;
  memo: string | null;
  updatedAt: string;
}
type SettingsResponse = SettingCurrent[];
```

**예시 응답**:
```json
[
  { "key": "global_max_pc_count", "value": "5", "memo": "기본 PC 대수", "updatedAt": "2026-05-01T00:00:00.000Z" },
  { "key": "inspection_start_time", "value": "09:00", "memo": null, "updatedAt": "2026-05-01T00:00:00.000Z" },
  { "key": "inspection_end_time", "value": "17:00", "memo": null, "updatedAt": "2026-05-01T00:00:00.000Z" },
  { "key": "d7_alert_enabled", "value": "true", "memo": "D-7 알림 활성화", "updatedAt": "2026-05-01T00:00:00.000Z" }
]
```

---

#### GET /settings/:key

**설명**: 특정 설정의 현재값 + 전체 변경 이력 조회

**인증**: 인증 필요

**Path Parameters**: `key: string`

**Response 200**:
```typescript
interface SettingWithHistory {
  current: SettingCurrent;
  history: {
    id: number;
    key: string;
    value: string;
    memo: string | null;
    createdAt: string;
  }[];
}
```

---

#### PUT /settings/:key

**설명**: 설정값 저장 (이력 자동 기록, 덮어쓰지 않고 INSERT)

**인증**: 인증 필요

**Path Parameters**: `key: string`

**Request Body**:
```typescript
interface UpsertSettingDto {
  value: string;   // 모든 값은 문자열로 저장
  memo?: string;   // 변경 사유 메모
}
```

**예시 Request**:
```json
{
  "value": "7",
  "memo": "PC 추가 도입으로 대수 증가"
}
```

**Response 200**:
```typescript
interface SystemSettingHistory {
  id: number;
  key: string;
  value: string;
  memo: string | null;
  createdAt: string;
}
```

---

## 공통 에러 응답 형식

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];  // 단일 메시지 또는 validation 에러 배열
  error: string;               // "Unauthorized", "Not Found", "Conflict" 등
}
```

**예시**:
```json
{
  "statusCode": 409,
  "message": "해당 날짜의 PC 예약이 마감되었습니다. (5대 한도)",
  "error": "Conflict"
}
```

## HTTP 상태 코드 정리

| 코드 | 의미 | 사용 시점 |
|------|------|---------|
| 200 | OK | GET, PUT, DELETE 성공 |
| 201 | Created | POST 성공 |
| 400 | Bad Request | 잘못된 요청 형식 |
| 401 | Unauthorized | 인증 실패 또는 토큰 만료 |
| 403 | Forbidden | 권한 없음 (역할 불일치) |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복 예약, 유니크 제약 위반 |
| 422 | Unprocessable Entity | DTO 검증 실패 |
| 500 | Internal Server Error | 서버 오류 |
