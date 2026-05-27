import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('업체 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '업체 등록 (관리자)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '업체 목록 조회' })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('next-code')
  @Roles('admin')
  @ApiOperation({ summary: '다음 업체 코드 조회 (관리자)' })
  getNextCode() {
    return this.companiesService.getNextCode();
  }

  @Get('unregistered')
  @Roles('admin')
  @ApiOperation({ summary: '점검 주기 내 미예약 업체 목록 (관리자)' })
  getUnregistered() {
    return this.companiesService.getUnregisteredCompanies();
  }

  @Get(':id')
  @ApiOperation({ summary: '업체 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '업체 수정 (관리자)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '업체 삭제 (관리자)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.remove(id);
  }
}
