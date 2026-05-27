import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  async sendAndSave(
    userId: number,
    message: string,
    type: string,
    fcmToken?: string,
    title?: string,
  ) {
    // DB에 알림 저장
    const notification = await this.prisma.notification.create({
      data: { userId, message, type },
    });

    // FCM 발송 (토큰이 있으면)
    if (fcmToken) {
      await this.firebase.sendToToken(fcmToken, title ?? '예방점검 알림', message, {
        type,
        notificationId: String(notification.id),
      }).catch(() => null); // FCM 실패해도 DB 저장은 유지
    }

    return notification;
  }

  async sendBulk(
    targets: { userId: number; fcmToken?: string }[],
    message: string,
    type: string,
    title?: string,
  ) {
    // DB 일괄 저장
    await this.prisma.notification.createMany({
      data: targets.map((t) => ({ userId: t.userId, message, type })),
    });

    // FCM 멀티캐스트
    const tokens = targets.filter((t) => t.fcmToken).map((t) => t.fcmToken);
    if (tokens.length > 0) {
      await this.firebase.sendMulticast(tokens, title ?? '예방점검 알림', message, { type });
    }
  }

  async findByUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
