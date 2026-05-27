import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateScheduleDto, requester: { role: string; companyId: number }) {
    // 파트너는 본인 업체만 예약 가능
    if (requester.role === 'partner' && dto.companyId !== requester.companyId) {
      throw new ForbiddenException('본인 업체의 일정만 등록할 수 있습니다.');
    }

    const date = new Date(dto.date);

    // 트랜잭션으로 동시성 처리 (Race Condition 방지)
    return this.prisma.$transaction(async (tx) => {
      // 1. 동일 날짜+시간대 PC 가용 좌석 확인 (최대 5대)
      const company = await tx.company.findUnique({ where: { id: dto.companyId } });
      if (!company) throw new NotFoundException('업체를 찾을 수 없습니다.');

      const pcSetting = await tx.systemSettingHistory.findFirst({
        where: { key: 'global_max_pc_count' },
        orderBy: { createdAt: 'desc' },
      });
      const globalMaxPc = pcSetting ? parseInt(pcSetting.value, 10) : 5;

      // 1. 일별 전체 예약 대수 확인 (시간대 무관, PC 슬롯 기준)
      const dayCount = await tx.schedule.count({
        where: { date, status: { not: 'cancelled' } },
      });

      if (dayCount >= globalMaxPc) {
        throw new ConflictException(
          `해당 날짜의 PC 예약이 마감되었습니다. (${globalMaxPc}대 한도)`,
        );
      }

      // 2. 엔지니어 동일 시간대 중복 예약 확인
      const engineerConflict = await tx.schedule.findFirst({
        where: {
          engineerId: dto.engineerId,
          date,
          startTime: dto.startTime,
          status: { not: 'cancelled' },
        },
      });

      if (engineerConflict) {
        throw new ConflictException('해당 엔지니어는 같은 시간대에 이미 일정이 있습니다.');
      }

      // 3. 동일 업체 + 동일 계약 + 동일 날짜 중복 방지
      const companyConflict = await tx.schedule.findFirst({
        where: {
          companyId: dto.companyId,
          companyContractId: dto.companyContractId ?? null,
          date,
          status: { not: 'cancelled' },
        },
      });

      if (companyConflict) {
        throw new ConflictException('해당 계약은 같은 날짜에 이미 일정이 등록되어 있습니다.');
      }

      // 4. pcNumber 자동 배정 (당일 기존 예약 수 + 1)
      const pcNumber = dayCount + 1;

      const endDate = dto.endDate ? new Date(dto.endDate) : null;

      return tx.schedule.create({
        data: {
          companyId: dto.companyId,
          engineerId: dto.engineerId,
          date,
          ...(endDate !== null && { endDate }),
          startTime: dto.startTime,
          endTime: dto.endTime,
          pcNumber,
          ...(dto.companyContractId !== undefined && { companyContractId: dto.companyContractId }),
          ...(dto.memo !== undefined && { memo: dto.memo }),
        },
        include: {
          company: { select: { name: true, code: true } },
          engineer: { select: { name: true } },
          companyContract: { select: { contractName: true, inspectionLocation: true, seq: true } },
        },
      });
    });
  }

  async findAll(
    requester: { role: string; companyId: number },
    filters: { year?: number; month?: number; companyId?: number; engineerId?: number },
  ) {
    const where: any = {};

    // 파트너는 본인 업체 데이터만 조회
    if (requester.role === 'partner') {
      if (!requester.companyId) return []; // 소속 없는 파트너 → 빈 배열
      where.companyId = requester.companyId;
    } else if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.engineerId) where.engineerId = filters.engineerId;

    if (filters.year && filters.month) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 0);
      where.date = { gte: start, lte: end };
    } else if (filters.year) {
      where.date = {
        gte: new Date(filters.year, 0, 1),
        lte: new Date(filters.year, 11, 31, 23, 59, 59),
      };
    }

    return this.prisma.schedule.findMany({
      where,
      include: {
        company: { select: { name: true, code: true } },
        engineer: { select: { name: true } },
        companyContract: { select: { contractName: true, inspectionLocation: true, seq: true } },
        report: { select: { fileUrl: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        company: true,
        engineer: { select: { id: true, name: true, email: true } },
        report: true,
      },
    });
    if (!schedule) throw new NotFoundException('일정을 찾을 수 없습니다.');
    return schedule;
  }

  async update(id: number, dto: UpdateScheduleDto, requester: { role: string; companyId: number }) {
    const schedule = await this.findOne(id);

    if (requester.role === 'partner' && schedule.companyId !== requester.companyId) {
      throw new ForbiddenException('본인 업체의 일정만 수정할 수 있습니다.');
    }

    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.endDate !== undefined) {
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.prisma.schedule.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { name: true } },
        engineer: { select: { name: true } },
      },
    });
  }

  async remove(id: number, requester: { role: string; companyId: number }) {
    const schedule = await this.findOne(id);

    if (requester.role === 'partner' && schedule.companyId !== requester.companyId) {
      throw new ForbiddenException('본인 업체의 일정만 삭제할 수 있습니다.');
    }

    return this.prisma.schedule.delete({ where: { id } });
  }

  // 가용 시간대 추천 (특정 날짜 기준)
  async getAvailableSlots(date: string) {
    const targetDate = new Date(date);
    const timeSlots = [
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00',
    ];

    const pcSetting = await this.prisma.systemSettingHistory.findFirst({
      where: { key: 'global_max_pc_count' },
      orderBy: { createdAt: 'desc' },
    });
    const maxPcCount = pcSetting ? parseInt(pcSetting.value, 10) : 5;

    const booked = await this.prisma.schedule.groupBy({
      by: ['startTime'],
      where: { date: targetDate, status: { not: 'cancelled' } },
      _count: { startTime: true },
    });

    const bookedMap = new Map(booked.map((b) => [b.startTime, b._count.startTime]));

    return timeSlots.map((time) => ({
      time,
      available: maxPcCount - (bookedMap.get(time) ?? 0),
      total: maxPcCount,
    }));
  }

  // D-7 알림 대상 조회 (스케줄러에서 사용)
  async getD7Targets() {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const companies = await this.prisma.company.findMany({
      include: { users: { where: { fcmToken: { not: null } } } },
    });

    const targets = [];
    for (const company of companies) {
      const scheduled = await this.prisma.schedule.findFirst({
        where: {
          companyId: company.id,
          date: { gte: startOfDay, lte: endOfDay },
          status: { not: 'cancelled' },
        },
      });

      if (!scheduled && company.users.length > 0) {
        targets.push(company);
      }
    }
    return targets;
  }
}
