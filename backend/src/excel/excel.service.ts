import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class ExcelService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async exportSchedules(filters: {
    year?: number;
    month?: number;
    companyId?: number;
  }): Promise<{ url: string }> {
    const where: any = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.year && filters.month) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 0);
      where.date = { gte: start, lte: end };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        company: true,
        engineer: { select: { name: true } },
        report: { select: { fileUrl: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // 미예약 업체 목록
    const unregisteredCompanies = await this.getUnregisteredCompanies(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '유지보수 예방점검 시스템';
    workbook.created = new Date();

    // === 시트 1: 일정 목록 ===
    const scheduleSheet = workbook.addWorksheet('점검 일정');
    scheduleSheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: '업체명', key: 'company', width: 20 },
      { header: '업체코드', key: 'code', width: 12 },
      { header: '점검일', key: 'date', width: 14 },
      { header: '시작시간', key: 'startTime', width: 10 },
      { header: '종료시간', key: 'endTime', width: 10 },
      { header: 'PC번호', key: 'pcNumber', width: 10 },
      { header: '담당 엔지니어', key: 'engineer', width: 16 },
      { header: '상태', key: 'status', width: 12 },
      { header: '메모', key: 'memo', width: 24 },
      { header: '리포트 URL', key: 'reportUrl', width: 40 },
    ];

    // 헤더 스타일
    scheduleSheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    schedules.forEach((s, idx) => {
      const row = scheduleSheet.addRow({
        no: idx + 1,
        company: s.company.name,
        code: s.company.code,
        date: s.date.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
        pcNumber: s.pcNumber,
        engineer: s.engineer.name,
        status: this.translateStatus(s.status),
        memo: s.memo ?? '',
        reportUrl: s.report?.fileUrl ?? '',
      });

      // 리포트 URL을 하이퍼링크로 삽입
      if (s.report?.fileUrl) {
        const urlCell = row.getCell('reportUrl');
        urlCell.value = { text: '리포트 보기', hyperlink: s.report.fileUrl };
        urlCell.font = { color: { argb: 'FF0563C1' }, underline: true };
      }
    });

    // === 시트 2: 미예약 업체 ===
    const unregSheet = workbook.addWorksheet('미예약 업체');
    unregSheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: '업체명', key: 'company', width: 20 },
      { header: '업체코드', key: 'code', width: 12 },
      { header: '점검 주기(일)', key: 'cycle', width: 14 },
      { header: '마지막 점검일', key: 'lastInspection', width: 18 },
    ];

    unregSheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    unregisteredCompanies.forEach((c, idx) => {
      unregSheet.addRow({
        no: idx + 1,
        company: c.name,
        code: c.code,
        cycle: c.inspectionCycle,
        lastInspection: c.lastInspection ?? '없음',
      });
    });

    // Buffer 생성 후 S3 업로드
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const key = `exports/schedules-${Date.now()}.xlsx`;
    const url = await this.s3.uploadBuffer(key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const signedUrl = await this.s3.getPresignedUrl(key, 3600);

    return { url: signedUrl };
  }

  private async getUnregisteredCompanies(filters: { year?: number; month?: number }) {
    const companies = await this.prisma.company.findMany();
    const result = [];

    for (const company of companies) {
      const where: any = { companyId: company.id, status: { not: 'cancelled' } };
      if (filters.year && filters.month) {
        const start = new Date(filters.year, filters.month - 1, 1);
        const end = new Date(filters.year, filters.month, 0);
        where.date = { gte: start, lte: end };
      }

      const hasSchedule = await this.prisma.schedule.findFirst({ where });
      if (!hasSchedule) {
        const lastSchedule = await this.prisma.schedule.findFirst({
          where: { companyId: company.id, status: 'completed' },
          orderBy: { date: 'desc' },
        });
        result.push({
          ...company,
          lastInspection: lastSchedule?.date.toISOString().split('T')[0] ?? null,
        });
      }
    }
    return result;
  }

  private translateStatus(status: string): string {
    const map = {
      pending: '대기', confirmed: '확정', completed: '완료', cancelled: '취소',
    };
    return map[status] ?? status;
  }
}
