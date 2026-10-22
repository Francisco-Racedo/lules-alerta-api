import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNoticeDto {
  @IsString()
  @IsNotEmpty({ message: 'El título del aviso es obligatorio' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description: string;

  @IsString()
  @IsOptional()
  @IsIn(['CRITICAL', 'WARNING', 'INFO'])
  severity?: string;

  @IsString()
  @IsOptional()
  @IsIn(['OFICIAL', 'VECINAL'])
  sourceType?: string;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsString()
  @IsOptional()
  barrio?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}