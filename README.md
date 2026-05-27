# 유지보수 예방점검 일정 관리 시스템

협력사 예방점검 일정을 관리하고 관리자가 전체 현황을 모니터링하는 웹 기반 시스템입니다.

## 시스템 요구사항

- Docker Desktop for Windows (4.0 이상)
- Docker Compose v2.0 이상
- 포트 3000, 3001, 5432 사용 가능

## 빠른 시작

### 1. 저장소 설정
```powershell
# 환경변수 파일 복사
Copy-Item .env.example .env
```

### 2. Docker 빌드 및 실행
```powershell
# 전체 스택 빌드 및 실행 (최초 실행)
docker-compose up -d --build

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

### 3. 접속 정보
| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:3001/api |
| Swagger 문서 | http://localhost:3001/api/docs |

### 4. 초기 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 관리자 | admin@test.com | admin1234 |
| 협력사 1 (삼성SDS) | partner1@test.com | partner1234 |
| 협력사 2 (LG CNS) | partner2@test.com | partner1234 |
| 협력사 3 (SK C&C) | partner3@test.com | partner1234 |

## 개발 환경 실행 (로컬)

### 백엔드
```powershell
cd backend
npm install
# .env 파일에서 DATABASE_URL을 로컬 PostgreSQL로 변경
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### 프론트엔드
```powershell
cd frontend
npm install
# .env.local 파일 생성
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

## Docker 명령어

```powershell
# 전체 재빌드 (코드 변경 시)
docker-compose up -d --build

# 특정 서비스만 재빌드
docker-compose up -d --build backend
docker-compose up -d --build frontend

# 서비스 중지
docker-compose down

# 데이터 포함 완전 초기화
docker-compose down -v
docker-compose up -d --build

# 로그 스트리밍
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# 백엔드 컨테이너 접속
docker-compose exec backend sh

# DB 접속
docker-compose exec postgres psql -U postgres -d maintenance_db
```

## 아키텍처

```
+------------------------------------------+
|         Docker Compose Network           |
|                                          |
|  +----------+    +-------------------+  |
|  | Frontend |    | Backend (NestJS)  |  |
|  | Next.js  +--->+ Port: 3001        |  |
|  | Port:3000|    +--------+----------+  |
|  +----------+             |             |
|                  +--------v----------+  |
|                  |  PostgreSQL 15    |  |
|                  |  Port: 5432       |  |
|                  +-------------------+  |
+------------------------------------------+
```

## 주요 기능

- **관리자**: 대시보드, 일정 관리, 업체 관리, 엑셀 다운로드, 시스템 설정
- **협력사**: 일정 조회, 일정 등록 마법사
- **공통**: 알림, JWT 인증

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL | http://localhost:3001 |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | - |
| `JWT_SECRET` | JWT 서명 키 | - |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 | - |
| `USE_LOCAL_STORAGE` | 로컬 파일 저장 사용 | true |

## 트러블슈팅

### 포트 충돌
```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
```

### DB 초기화
```powershell
docker-compose down -v
docker-compose up -d postgres
# 30초 대기 후
docker-compose up -d backend frontend
```

### 빌드 캐시 클리어
```powershell
docker-compose down
docker system prune -f
docker-compose up -d --build
```
