import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  // PDF 파일 업로드 후 리포트 저장
  async uploadReport(scheduleId: number, file: Express.Multer.File) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('일정을 찾을 수 없습니다.');

    const existing = await this.prisma.report.findUnique({ where: { scheduleId } });
    if (existing) throw new ConflictException('이미 리포트가 등록된 일정입니다.');

    const key = `reports/schedule-${scheduleId}-${Date.now()}.pdf`;
    const fileUrl = await this.s3.uploadBuffer(key, file.buffer, 'application/pdf');

    const report = await this.prisma.report.create({
      data: { scheduleId, fileUrl },
    });

    // 점검 완료 상태로 업데이트
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'completed' },
    });

    return report;
  }

  async findBySchedule(scheduleId: number) {
    const report = await this.prisma.report.findUnique({
      where: { scheduleId },
      include: { schedule: { include: { company: true, engineer: true } } },
    });
    if (!report) throw new NotFoundException('리포트를 찾을 수 없습니다.');
    return report;
  }

  // 다운로드용 Pre-signed URL 발급
  async getDownloadUrl(scheduleId: number): Promise<{ url: string }> {
    const report = await this.prisma.report.findUnique({ where: { scheduleId } });
    if (!report) throw new NotFoundException('리포트를 찾을 수 없습니다.');

    // S3 URL에서 key 추출
    const url = new URL(report.fileUrl);
    const key = url.pathname.slice(1); // 선행 '/' 제거
    const signedUrl = await this.s3.getPresignedUrl(key, 3600);
    return { url: signedUrl };
  }
}
