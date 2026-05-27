import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashedPassword },
    });
    const { password, ...result } = user;
    return result;
  }

  async findAll(requester: { role: string; companyId: number }) {
    const where = requester.role === 'partner'
      ? { companyId: requester.companyId }
      : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, company: { select: { name: true } }, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, company: { select: { name: true, code: true } }, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async update(id: number, dto: UpdateUserDto, requester: { id: number; role: string }) {
    if (requester.role !== 'admin' && requester.id !== id) {
      throw new ForbiddenException('본인 정보만 수정할 수 있습니다.');
    }
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  // 엔지니어 목록 (일정 배정용)
  async getEngineers() {
    return this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, email: true },
    });
  }
}
