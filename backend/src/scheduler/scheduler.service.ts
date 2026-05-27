import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // 매일 오전 09:00 — D-7 알림 발송
  @Cron('0 9 * * *', { timeZone: 'Asia/Seoul' })
  async sendD7Notifications() {
    this.logger.log('D-7 알림 배치 시작');

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const companies = await this.prisma.company.findMany({
      include: {
        users: {
          where: { role: 'partner' },
          select: { id: true, fcmToken: true },
        },
      },
    });

    let sentCount = 0;
    for (const company of companies) {
      if (company.users.length === 0) continue;

      // 7일 후 날짜에 예약 없는 업체
      const hasSchedule = await this.prisma.schedule.findFirst({
        where: {
          companyId: company.id,
          date: { gte: startOfDay, lte: endOfDay },
          status: { not: 'cancelled' },
        },
      });

      if (!hasSchedule) {
        const targets = company.users.map((u) => ({
          userId: u.id,
          fcmToken: u.fcmToken ?? undefined,
        }));

        await this.notifications.sendBulk(
          targets,
          `[${company.name}] 7일 후 예방점검 일정이 없습니다. 지금 예약해 주세요.`,
          'd7_reminder',
          '예방점검 D-7 알림',
        );
        sentCount++;
      }
    }

    this.logger.log(`D-7 알림 완료: ${sentCount}개 업체에 발송`);
  }

  // 매일 오전 08:00 — 당일 일정 확인 알림
  @Cron('0 8 * * *', { timeZone: 'Asia/Seoul' })
  async sendTodayReminders() {
    this.logger.log('당일 일정 알림 배치 시작');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todaySchedules = await this.prisma.schedule.findMany({
      where: {
        date: { gte: today, lte: endOfToday },
        status: { in: ['pending', 'confirmed'] },
      },
      include: {
        company: { include: { users: { where: { role: 'partner' } } } },
        engineer: { select: { id: true, fcmToken: true } },
      },
    });

    for (const schedule of todaySchedules) {
      const message = `오늘 ${schedule.startTime} 예방점검이 예정되어 있습니다. (${schedule.company.name})`;

      // 파트너 사용자에게 알림
      for (const user of schedule.company.users) {
        await this.notifications.sendAndSave(
          user.id, message, 'today_reminder', user.fcmToken ?? undefined, '오늘 점검 일정',
        );
      }

      // 엔지니어에게 알림
      if (schedule.engineer.fcmToken) {
        await this.notifications.sendAndSave(
          schedule.engineer.id,
          `오늘 ${schedule.startTime} ${schedule.company.name} 점검 일정이 있습니다.`,
          'today_reminder',
          schedule.engineer.fcmToken,
          '오늘 점검 일정',
        );
      }
    }

    this.logger.log(`당일 알림 완료: ${todaySchedules.length}건`);
  }

  // 매주 월요일 오전 09:00 — 미예약 업체 감지
  @Cron('0 9 * * 1', { timeZone: 'Asia/Seoul' })
  async detectUnregisteredCompanies() {
    this.logger.log('미예약 업체 감지 배치 시작');

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const companies = await this.prisma.company.findMany({
      include: {
        users: {
          where: { role: 'admin' },
          select: { id: true, fcmToken: true },
        },
      },
    });

    const unregistered = [];
    for (const company of companies) {
      const hasSchedule = await this.prisma.schedule.findFirst({
        where: {
          companyId: company.id,
          date: { gte: today, lte: nextWeek },
          status: { not: 'cancelled' },
        },
      });
      if (!hasSchedule) unregistered.push(company.name);
    }

    if (unregistered.length > 0) {
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin', fcmToken: { not: null } },
        select: { id: true, fcmToken: true },
      });

      const message = `향후 7일 내 미예약 업체 ${unregistered.length}개: ${unregistered.slice(0, 3).join(', ')}${unregistered.length > 3 ? ' 외' : ''}`;

      await this.notifications.sendBulk(
        admins.map((a) => ({ userId: a.id, fcmToken: a.fcmToken })),
        message,
        'unregistered_alert',
        '미예약 업체 알림',
      );
    }

    this.logger.log(`미예약 업체 감지 완료: ${unregistered.length}개`);
  }
}
