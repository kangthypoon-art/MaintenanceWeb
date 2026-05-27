import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyContractDto } from './dto/create-company-contract.dto';
import { UpdateCompanyContractDto } from './dto/update-company-contract.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyContractsService {
  constructor(private prisma: PrismaService) {}

  async findByCode(code: string) {
    return this.prisma.companyContract.findMany({
      where: { code },
      orderBy: { seq: 'asc' },
    });
  }

  async create(code: string, dto: CreateCompanyContractDto) {
    const agg = await this.prisma.companyContract.aggregate({
      where: { code },
      _max: { seq: true },
    });
    const nextSeq = (agg._max.seq ?? 0) + 1;

    const data: Prisma.CompanyContractCreateInput = {
      company: { connect: { code } },
      seq: nextSeq,
      contractName: dto.contractName,
      ...(dto.inspectionLocation && { inspectionLocation: dto.inspectionLocation }),
    };
    return this.prisma.companyContract.create({ data });
  }

  async update(id: number, dto: UpdateCompanyContractDto) {
    const exists = await this.prisma.companyContract.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('계약 내역을 찾을 수 없습니다.');

    const data: Prisma.CompanyContractUpdateInput = {
      ...(dto.contractName       !== undefined && { contractName:       dto.contractName }),
      ...(dto.inspectionLocation !== undefined && { inspectionLocation: dto.inspectionLocation }),
    };
    return this.prisma.companyContract.update({ where: { id }, data });
  }

  async remove(id: number) {
    const exists = await this.prisma.companyContract.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('계약 내역을 찾을 수 없습니다.');
    return this.prisma.companyContract.delete({ where: { id } });
  }
}
