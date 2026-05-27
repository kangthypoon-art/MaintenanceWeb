import { IsString, IsInt, Min, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ContractItemDto {
  @ApiProperty({ example: '2026년 유지보수 계약' })
  @IsString()
  contractName: string;

  @ApiProperty({ example: '본사,DRS', required: false })
  @IsString()
  @IsOptional()
  inspectionLocation?: string;
}

export class CreateCompanyDto {
  @ApiProperty({ example: '(주)테스트업체' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CMP0001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 30, description: '점검 주기 (일 단위)' })
  @IsInt()
  @Min(1)
  inspectionCycle: number;

  @ApiProperty({ type: [ContractItemDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  contracts?: ContractItemDto[];
}
