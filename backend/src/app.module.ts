import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FirebaseModule } from './firebase/firebase.module';
import { S3Module } from './s3/s3.module';
import { ExcelModule } from './excel/excel.module';
import { AppSchedulerModule } from './scheduler/scheduler.module';
import { ContractsModule } from './contracts/contracts.module';
import { CompanyContractsModule } from './company-contracts/company-contracts.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    SchedulesModule,
    ReportsModule,
    NotificationsModule,
    FirebaseModule,
    S3Module,
    ExcelModule,
    AppSchedulerModule,
    ContractsModule,
    CompanyContractsModule,
    SettingsModule,
  ],
})
export class AppModule {}
