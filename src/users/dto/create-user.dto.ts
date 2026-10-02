import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceId: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;
}