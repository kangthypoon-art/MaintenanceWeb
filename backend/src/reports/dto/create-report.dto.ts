import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ example: 1, description: '일정 ID' })
  @IsInt()
  scheduleId: number;
}
