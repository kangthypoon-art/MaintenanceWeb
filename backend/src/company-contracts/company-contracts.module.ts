import { Module } from '@nestjs/common';
import { CompanyContractsController } from './company-contracts.controller';
import { CompanyContractsService } from './company-contracts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyContractsController],
  providers: [CompanyContractsService],
})
export class CompanyContractsModule {}
