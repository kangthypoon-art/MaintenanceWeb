import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: '액세스 토큰 갱신' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('check-email')
  @ApiOperation({ summary: '이메일 사용 가능 여부 확인 (인증 불필요)' })
  checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Post('register')
  @ApiOperation({ summary: '회원가입 (인증 불필요)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('withdraw')
  @ApiOperation({ summary: '회원탈퇴 (이메일+비밀번호 확인)' })
  withdraw(@Body() dto: WithdrawDto) {
    return this.authService.withdraw(dto);
  }

  @Get('companies')
  @ApiOperation({ summary: '협력사 목록 조회 (가입용, 인증 불필요)' })
  getCompanies() {
    return this.authService.getCompaniesForRegister();
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FCM 토큰 등록/갱신' })
  updateFcmToken(@Request() req, @Body('fcmToken') fcmToken: string) {
    return this.authService.updateFcmToken(req.user.id, fcmToken);
  }
}
