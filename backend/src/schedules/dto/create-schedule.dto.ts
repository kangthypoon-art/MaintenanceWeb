import { IsInt, IsString, IsDateString, IsOptional, Matches, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  engineerId: number;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '2026-05-03', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime은 HH:MM 형식이어야 합니다.' })
  startTime: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime은 HH:MM 형식이어야 합니다.' })
  endTime: string;

  @ApiProperty({ example: 1, description: 'PC 번호 (서버 자동 배정)', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  pcNumber?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  companyContractId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  memo?: string;
}
