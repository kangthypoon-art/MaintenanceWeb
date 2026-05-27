import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyContractsService } from './company-contracts.service';
import { CreateCompanyContractDto } from './dto/create-company-contract.dto';
import { UpdateCompanyContractDto } from './dto/update-company-contract.dto';

@ApiTags('company-contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company-contracts')
export class CompanyContractsController {
  constructor(private readonly service: CompanyContractsService) {}

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Post(':code')
  create(
    @Param('code') code: string,
    @Body() dto: CreateCompanyContractDto,
  ) {
    return this.service.create(code, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyContractDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
