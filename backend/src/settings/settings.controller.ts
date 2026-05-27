import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@ApiTags('시스템 설정')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: '전체 설정 현재값 조회' })
  findAll() {
    return this.settingsService.getAllCurrent();
  }

  @Get(':key')
  @ApiOperation({ summary: '특정 설정 현재값 + 변경 이력 조회' })
  findOne(@Param('key') key: string) {
    return this.settingsService.getWithHistory(key);
  }

  @Put(':key')
  @ApiOperation({ summary: '설정값 저장 (이력 자동 기록)' })
  upsert(@Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.settingsService.setValue(key, dto.value, dto.memo);
  }
}
