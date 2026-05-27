import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsEnum(['pending', 'confirmed', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
