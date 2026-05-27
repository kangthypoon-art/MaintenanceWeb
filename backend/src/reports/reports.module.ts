import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    S3Module,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
