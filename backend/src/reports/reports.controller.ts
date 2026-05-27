import {
  Controller, Post, Get, Param, ParseIntPipe,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('점검 리포트')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('schedule/:scheduleId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'PDF 리포트 업로드' })
  @ApiConsumes('multipart/form-data')
  uploadReport(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reportsService.uploadReport(scheduleId, file);
  }

  @Get('schedule/:scheduleId')
  @ApiOperation({ summary: '리포트 조회' })
  findBySchedule(@Param('scheduleId', ParseIntPipe) scheduleId: number) {
    return this.reportsService.findBySchedule(scheduleId);
  }

  @Get('schedule/:scheduleId/download')
  @ApiOperation({ summary: '리포트 다운로드 URL 발급 (1시간 유효)' })
  getDownloadUrl(@Param('scheduleId', ParseIntPipe) scheduleId: number) {
    return this.reportsService.getDownloadUrl(scheduleId);
  }
}
