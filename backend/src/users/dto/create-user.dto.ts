import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: '홍길동' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: ['admin', 'partner'], default: 'partner' })
  @IsEnum(['admin', 'partner'])
  @IsOptional()
  role?: 'admin' | 'partner';

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  companyId?: number;
}
