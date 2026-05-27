import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExcelService } from './excel.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('엑셀 익스포트')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('excel')
export class ExcelController {
  constructor(private excelService: ExcelService) {}

  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: '일정 엑셀 내보내기 (관리자, 미예약 업체 시트 포함)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  export(
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('companyId') companyId?: number,
  ) {
    return this.excelService.exportSchedules({
      year: year ? +year : undefined,
      month: month ? +month : undefined,
      companyId: companyId ? +companyId : undefined,
    });
  }
}
