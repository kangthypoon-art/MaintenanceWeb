import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 업체 생성
  const company1 = await prisma.company.upsert({
    where: { code: 'SDS001' },
    update: {},
    create: { name: '삼성SDS', code: 'SDS001', inspectionCycle: 30 },
  });
  const company2 = await prisma.company.upsert({
    where: { code: 'LGC001' },
    update: {},
    create: { name: 'LG CNS', code: 'LGC001', inspectionCycle: 30 },
  });
  const company3 = await prisma.company.upsert({
    where: { code: 'SKC001' },
    update: {},
    create: { name: 'SK C&C', code: 'SKC001', inspectionCycle: 60 },
  });
  const company4 = await prisma.company.upsert({
    where: { code: 'KTD001' },
    update: {},
    create: { name: 'KT DS', code: 'KTD001', inspectionCycle: 90 },
  });
  const company5 = await prisma.company.upsert({
    where: { code: 'HYD001' },
    update: {},
    create: { name: '현대오토에버', code: 'HYD001', inspectionCycle: 30 },
  });
  console.log(`업체 생성: ${company1.name}, ${company2.name}, ${company3.name}, ${company4.name}, ${company5.name}`);

  // 관리자 계정
  const adminPw = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: { email: 'admin@test.com', password: adminPw, name: '관리자', role: 'admin' },
  });
  console.log(`관리자 계정 생성: ${admin.email}`);

  // 협력사 계정
  const partnerPw = await bcrypt.hash('partner1234', 10);
  const partner1 = await prisma.user.upsert({
    where: { email: 'partner1@test.com' },
    update: {},
    create: { email: 'partner1@test.com', password: partnerPw, name: '김철수', role: 'partner', companyId: company1.id },
  });
  const partner2 = await prisma.user.upsert({
    where: { email: 'partner2@test.com' },
    update: {},
    create: { email: 'partner2@test.com', password: partnerPw, name: '이영희', role: 'partner', companyId: company2.id },
  });
  const partner3 = await prisma.user.upsert({
    where: { email: 'partner3@test.com' },
    update: {},
    create: { email: 'partner3@test.com', password: partnerPw, name: '박민수', role: 'partner', companyId: company3.id },
  });
  console.log(`파트너 계정 생성: ${partner1.email}, ${partner2.email}, ${partner3.email}`);

  // 시스템 설정
  for (const [key, value, memo] of [
    ['MAX_PC_COUNT', '5', '일일 최대 PC 대수'],
    ['START_HOUR', '9', '점검 시작 시간'],
    ['END_HOUR', '18', '점검 종료 시간'],
    ['D7_ALARM', 'true', 'D-7 알림 활성화'],
  ] as [string, string, string][]) {
    await prisma.systemSettingHistory.create({ data: { key, value, memo } });
  }
  console.log('시스템 설정 생성 완료');

  console.log('시드 데이터 생성 완료');
  console.log('─────────────────────────────');
  console.log('관리자 로그인:  admin@test.com / admin1234');
  console.log('파트너1 로그인: partner1@test.com / partner1234');
  console.log('파트너2 로그인: partner2@test.com / partner1234');
  console.log('파트너3 로그인: partner3@test.com / partner1234');
  console.log('─────────────────────────────');
}

main().catch(console.error).finally(() => prisma.$disconnect());
