import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async getNextCode(): Promise<{ code: string }> {
    const agg = await this.prisma.company.aggregate({ _max: { id: true } });
    const nextId = (agg._max.id ?? 0) + 1;
    return { code: `CMP${nextId.toString().padStart(4, '0')}` };
  }

  async create(dto: CreateCompanyDto) {
    const companyData: Prisma.CompanyCreateInput = {
      name: dto.name,
      code: dto.code,
      inspectionCycle: dto.inspectionCycle,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({ data: companyData });

        if (dto.contracts && dto.contracts.length > 0) {
          for (let i = 0; i < dto.contracts.length; i++) {
            await tx.companyContract.create({
              data: {
                company: { connect: { code: company.code } },
                seq: i + 1,
                contractName: dto.contracts[i].contractName,
                ...(dto.contracts[i].inspectionLocation && {
                  inspectionLocation: dto.contracts[i].inspectionLocation,
                }),
              },
            });
          }
        }

        return company;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('이미 존재하는 업체 코드입니다.');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.company.findMany({
      include: {
        contracts: { orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] },
        companyContracts: { orderBy: { seq: 'asc' } },
        _count: { select: { users: true, schedules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
        companyContracts: { orderBy: { seq: 'asc' } },
      },
    });
    if (!company) throw new NotFoundException('업체를 찾을 수 없습니다.');
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto) {
    await this.findOne(id);
    const data: Prisma.CompanyUpdateInput = {
      ...(dto.name            !== undefined && { name:            dto.name }),
      ...(dto.inspectionCycle !== undefined && { inspectionCycle: dto.inspectionCycle }),
    };
    try {
      return await this.prisma.company.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('이미 존재하는 업체 코드입니다.');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.company.delete({ where: { id } });
  }

  async getUnregisteredCompanies() {
    const today = new Date();
    const companies = await this.prisma.company.findMany();

    const result = [];
    for (const company of companies) {
      const cycleDate = new Date(today);
      cycleDate.setDate(today.getDate() + company.inspectionCycle);

      const nextSchedule = await this.prisma.schedule.findFirst({
        where: {
          companyId: company.id,
          date: { gte: today, lte: cycleDate },
        },
      });

      if (!nextSchedule) {
        result.push({ ...company, daysUntilDue: company.inspectionCycle });
      }
    }
    return result;
  }
}
