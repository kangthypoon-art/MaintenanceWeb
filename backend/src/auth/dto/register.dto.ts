import { IsString, IsEmail, IsOptional, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '홍길동' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'hong@partner.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;
}
