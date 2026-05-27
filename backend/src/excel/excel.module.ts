import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [S3Module],
  providers: [ExcelService],
  controllers: [ExcelController],
  exports: [ExcelService],
})
export class ExcelModule {}
