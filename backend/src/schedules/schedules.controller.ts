import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('일정 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: '일정 등록 (중복/PC 좌석 자동 검증)' })
  create(@Body() dto: CreateScheduleDto, @Request() req) {
    return this.schedulesService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: '일정 목록 조회 (파트너는 본인 업체만)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'engineerId', required: false, type: Number })
  findAll(
    @Request() req,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('companyId') companyId?: number,
    @Query('engineerId') engineerId?: number,
  ) {
    return this.schedulesService.findAll(req.user, {
      year: year ? +year : undefined,
      month: month ? +month : undefined,
      companyId: companyId ? +companyId : undefined,
      engineerId: engineerId ? +engineerId : undefined,
    });
  }

  @Get('available-slots')
  @ApiOperation({ summary: '특정 날짜 가용 시간대 추천' })
  @ApiQuery({ name: 'date', required: true, example: '2026-05-01' })
  getAvailableSlots(@Query('date') date: string) {
    return this.schedulesService.getAvailableSlots(date);
  }

  @Get(':id')
  @ApiOperation({ summary: '일정 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '일정 수정' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
    @Request() req,
  ) {
    return this.schedulesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '일정 삭제' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.schedulesService.remove(id, req.user);
  }
}
