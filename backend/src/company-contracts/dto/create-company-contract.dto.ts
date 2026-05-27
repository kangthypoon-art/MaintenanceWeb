import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyContractDto {
  @ApiProperty({ example: '2026년 유지보수 계약' })
  @IsString()
  contractName: string;

  @ApiProperty({ example: '본사,DRS', required: false })
  @IsString()
  @IsOptional()
  inspectionLocation?: string;
}
