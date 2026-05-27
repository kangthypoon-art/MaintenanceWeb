import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private config: ConfigService) {}

  private initialized = false;

  onModuleInit() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');

    if (!projectId || projectId === 'your-firebase-project-id') {
      this.logger.warn('Firebase 설정이 없습니다. FCM 푸시 알림이 비활성화됩니다.');
      return;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey?.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin SDK 초기화 완료');
    } catch (error) {
      this.logger.warn(`Firebase 초기화 실패 (FCM 비활성화): ${error.message}`);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized) return null;
    try {
      return await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (error) {
      this.logger.error(`FCM 발송 실패 (token: ${token}): ${error.message}`);
      return null;
    }
  }

  async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized || tokens.length === 0) return { successCount: 0, failureCount: 0 };

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    this.logger.log(`FCM 멀티캐스트: 성공 ${result.successCount}, 실패 ${result.failureCount}`);
    return result;
  }
}
