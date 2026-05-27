# 05. 배포 가이드

## 1. 환경 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| OS | Windows 10 21H1+ | Windows 11 |
| RAM | 8GB | 16GB |
| 디스크 | 20GB 여유 | 50GB |
| Docker Desktop | 4.0+ | 최신 버전 |

## 2. Docker Desktop 설정 (Windows)

1. Docker Desktop 설치
2. Settings → Resources → WSL Integration → Ubuntu 활성화
3. Settings → Resources → Memory: 최소 4GB 할당
4. Settings → General → "Use WSL 2 based engine" 체크

## 3. 최초 배포 절차

### Step 1: 환경변수 설정
```powershell
cd C:\AIProjects\WepApp
Copy-Item .env.example .env
# .env 파일을 열어 JWT_SECRET 등 보안 값 변경
notepad .env
```

### Step 2: 이미지 빌드 및 컨테이너 시작
```powershell
docker-compose up -d --build
```

예상 소요 시간: 5~10분 (최초 빌드)

### Step 3: 상태 확인
```powershell
docker-compose ps
# 3개 컨테이너 모두 "running" 상태 확인
```

### Step 4: 접속 확인
- 프론트엔드: http://localhost:3000
- API: http://localhost:3001/api/health (있는 경우)

## 4. 서비스 시작 순서

Docker Compose healthcheck로 자동 처리:
1. PostgreSQL 시작 → healthcheck 통과 대기 (최대 50초)
2. Backend 시작 → Prisma migrate deploy 실행 → NestJS 서버 시작
3. Frontend 시작 → Next.js 서버 시작

## 5. 데이터 영속성

```
postgres_data → /var/lib/docker/volumes/webapp_postgres_data/_data
uploads_data  → /var/lib/docker/volumes/webapp_uploads_data/_data
```

## 6. 업데이트 배포

```powershell
# 코드 변경 후
docker-compose up -d --build backend    # 백엔드만 재빌드
docker-compose up -d --build frontend   # 프론트엔드만 재빌드
docker-compose up -d --build            # 전체 재빌드
```

## 7. 백업 및 복원

### DB 백업
```powershell
docker-compose exec postgres pg_dump -U postgres maintenance_db > backup_$(Get-Date -Format 'yyyyMMdd').sql
```

### DB 복원
```powershell
Get-Content backup_20260526.sql | docker-compose exec -T postgres psql -U postgres maintenance_db
```

## 8. 모니터링

```powershell
# 실시간 로그
docker-compose logs -f

# 리소스 사용량
docker stats

# 컨테이너 상태
docker-compose ps
```

## 9. 프로덕션 보안 주의사항

1. `.env` 파일의 `JWT_SECRET` 반드시 변경 (최소 32자 랜덤 문자열)
2. PostgreSQL 비밀번호 변경
3. CORS `FRONTEND_URL` 실제 도메인으로 설정
4. HTTPS 적용 (Nginx 리버스 프록시 또는 Cloudflare)
5. 방화벽에서 5432 포트 외부 접근 차단

## 10. 트러블슈팅

### 백엔드가 시작 안 될 때
```powershell
docker-compose logs backend
# "connect ECONNREFUSED" -> postgres 아직 준비 중, 잠시 대기
# "relation does not exist" -> migration 실패, DB 재시작 필요
```

### 프론트엔드에서 API 호출 실패
- `.env` 파일의 `NEXT_PUBLIC_API_URL` 확인
- 백엔드 컨테이너 실행 상태 확인: `docker-compose ps`
- CORS 설정 확인: 백엔드 `FRONTEND_URL` 환경변수

### DB 연결 실패
```powershell
docker-compose down -v
docker-compose up -d
```
