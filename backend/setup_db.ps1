# ============================================================
# 유지보수 예방점검 시스템 - DB 설치 및 초기화 스크립트
# 실행 방법: PowerShell을 관리자로 실행 후 아래 명령 입력
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup_db.ps1
# ============================================================

param(
    [string]$PgSuperPassword = "Admin1234!",
    [string]$AppDbName      = "maintenance_db",
    [string]$AppDbUser      = "maint_user",
    [string]$AppDbPassword  = "Maint2026!",
    [string]$PgPort         = "5432"
)

$PgBin = "C:\Program Files\PostgreSQL\17\bin"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "    [ERROR] $msg" -ForegroundColor Red }

# ── Step 1: PostgreSQL 설치 ──────────────────────────────────
Write-Step "PostgreSQL 17 설치 중..."

if (Test-Path "$PgBin\psql.exe") {
    Write-Ok "PostgreSQL 이미 설치되어 있습니다."
} else {
    Write-Host "  winget으로 설치 시도..."
    $result = winget install PostgreSQL.PostgreSQL.17 `
        --accept-source-agreements --accept-package-agreements --silent `
        --override "--mode unattended --superpassword $PgSuperPassword --servicename postgresql-17 --serviceaccount postgres --servicepassword $PgSuperPassword" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  winget 실패, Chocolatey로 재시도..."
        choco install postgresql17 --params "/Password:$PgSuperPassword" -y 2>&1
    }

    # 경로 갱신
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + `
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 설치 경로 자동 탐색
$pgVersions = @("17","16","15","14")
foreach ($v in $pgVersions) {
    if (Test-Path "C:\Program Files\PostgreSQL\$v\bin\psql.exe") {
        $PgBin = "C:\Program Files\PostgreSQL\$v\bin"
        Write-Ok "PostgreSQL $v 발견: $PgBin"
        break
    }
}

if (-not (Test-Path "$PgBin\psql.exe")) {
    Write-Err "PostgreSQL 설치를 확인할 수 없습니다. 수동 설치 후 재실행하세요."
    Write-Host "  다운로드: https://www.postgresql.org/download/windows/"
    exit 1
}

# ── Step 2: 서비스 시작 ─────────────────────────────────────
Write-Step "PostgreSQL 서비스 시작..."

$svcName = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Name
if ($svcName) {
    Start-Service -Name $svcName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $status = (Get-Service -Name $svcName).Status
    Write-Ok "서비스 상태: $status ($svcName)"
} else {
    Write-Err "PostgreSQL 서비스를 찾을 수 없습니다."
}

# ── Step 3: DB & 사용자 생성 ────────────────────────────────
Write-Step "데이터베이스 및 사용자 생성..."

$env:PGPASSWORD = $PgSuperPassword

$sqlCreateUser = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$AppDbUser') THEN
    CREATE ROLE $AppDbUser LOGIN PASSWORD '$AppDbPassword';
  END IF;
END
`$`$;
"@

$sqlCreateDb = @"
SELECT 'CREATE DATABASE $AppDbName OWNER $AppDbUser ENCODING ''UTF8'' LC_COLLATE ''Korean_Korea.949'' LC_CTYPE ''Korean_Korea.949'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$AppDbName')\gexec
"@

$sqlGrant = @"
GRANT ALL PRIVILEGES ON DATABASE $AppDbName TO $AppDbUser;
"@

# 사용자 생성
$sqlCreateUser | & "$PgBin\psql.exe" -U postgres -h localhost -p $PgPort -q 2>&1
if ($LASTEXITCODE -eq 0) { Write-Ok "사용자 '$AppDbUser' 생성/확인 완료" }
else { Write-Err "사용자 생성 실패" }

# DB 생성 (이미 있으면 무시)
$dbExists = & "$PgBin\psql.exe" -U postgres -h localhost -p $PgPort -tAc "SELECT 1 FROM pg_database WHERE datname='$AppDbName'" 2>&1
if ($dbExists -ne "1") {
    & "$PgBin\psql.exe" -U postgres -h localhost -p $PgPort -c "CREATE DATABASE $AppDbName OWNER $AppDbUser ENCODING 'UTF8' TEMPLATE template0;" 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Ok "데이터베이스 '$AppDbName' 생성 완료" }
    else { Write-Err "DB 생성 실패" }
} else {
    Write-Ok "데이터베이스 '$AppDbName' 이미 존재"
}

# 권한 부여
& "$PgBin\psql.exe" -U postgres -h localhost -p $PgPort -c "GRANT ALL PRIVILEGES ON DATABASE $AppDbName TO $AppDbUser;" 2>&1
Write-Ok "권한 부여 완료"

# ── Step 4: .env 파일 생성 ───────────────────────────────────
Write-Step ".env 파일 생성..."

$envContent = @"
# Database
DATABASE_URL="postgresql://${AppDbUser}:${AppDbPassword}@localhost:${PgPort}/${AppDbName}?schema=public"

# JWT
JWT_SECRET="maintenance-jwt-secret-$(Get-Random)-change-in-production"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="maintenance-refresh-secret-$(Get-Random)-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# AWS S3 (나중에 설정)
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET_NAME="maintenance-app-files"

# Firebase Admin SDK (나중에 설정)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email@project.iam.gserviceaccount.com"
"@

$envPath = Join-Path $PSScriptRoot ".env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
Write-Ok ".env 파일 생성: $envPath"

# ── Step 5: 연결 테스트 ──────────────────────────────────────
Write-Step "DB 연결 테스트..."

$env:PGPASSWORD = $AppDbPassword
$testResult = & "$PgBin\psql.exe" -U $AppDbUser -h localhost -p $PgPort -d $AppDbName -c "SELECT version();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Ok "DB 연결 성공!"
} else {
    Write-Err "DB 연결 실패: $testResult"
}

# ── 완료 요약 ────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  설치 완료!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  슈퍼유저:    postgres / $PgSuperPassword"
Write-Host "  앱 계정:     $AppDbUser / $AppDbPassword"
Write-Host "  데이터베이스: $AppDbName"
Write-Host "  포트:        $PgPort"
Write-Host ""
Write-Host "  다음 단계 (백엔드 디렉터리에서 실행):"
Write-Host "  1. npm install"
Write-Host "  2. npx prisma migrate dev --name init"
Write-Host "  3. npx prisma db seed   (선택: 초기 데이터)"
Write-Host "  4. npm run start:dev"
Write-Host "========================================" -ForegroundColor Yellow
