import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllCurrent(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSettingHistory.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const result: Record<string, string> = {};
    for (const row of rows) {
      if (!seen.has(row.key)) {
        seen.add(row.key);
        result[row.key] = row.value;
      }
    }
    return result;
  }

  async getWithHistory(key: string) {
    const history = await this.prisma.systemSettingHistory.findMany({
      where: { key },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      key,
      value: history[0]?.value ?? null,
      history: history.map((h) => ({
        id: h.id,
        value: h.value,
        memo: h.memo,
        createdAt: h.createdAt,
      })),
    };
  }

  async setValue(key: string, value: string, memo?: string) {
    const record = await this.prisma.systemSettingHistory.create({
      data: { key, value, memo },
    });
    return { key, value: record.value, createdAt: record.createdAt };
  }
}
