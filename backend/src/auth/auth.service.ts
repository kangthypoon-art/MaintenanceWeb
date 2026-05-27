import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    if (user.isDeleted) throw new UnauthorizedException('탈퇴한 계정입니다. 재가입 후 이용해 주세요.');

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId ?? null,
        phone: user.phone ?? undefined,
        isDeleted: user.isDeleted,
      },
    };
  }

  async checkEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { available: true, isDeleted: false };
    if (user.isDeleted) return { available: true, isDeleted: true };
    return { available: false, isDeleted: false };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (existing) {
      if (!existing.isDeleted) throw new ConflictException('이미 사용 중인 이메일입니다.');
      return this.prisma.user.update({
        where: { email: dto.email },
        data: {
          name: dto.name,
          phone: dto.phone,
          password: hashedPassword,
          companyId: dto.companyId ?? null,
          isDeleted: false,
          deletedAt: null,
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        companyId: dto.companyId ?? null,
        role: 'partner',
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async withdraw(dto: WithdrawDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    if (user.isDeleted) throw new BadRequestException('이미 탈퇴한 계정입니다.');

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { message: '회원탈퇴가 완료되었습니다.' };
  }

  async getCompaniesForRegister() {
    return this.prisma.company.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
  }

  async updateFcmToken(userId: number, fcmToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
    return { message: 'FCM 토큰이 업데이트되었습니다.' };
  }

  private generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwt.sign(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '1d'),
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    };
  }
}
