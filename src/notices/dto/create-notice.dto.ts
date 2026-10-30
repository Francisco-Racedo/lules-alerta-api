import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoticeDto {
  @ApiProperty({ example: 'Corte de tránsito en Avenida Principal' })
  @IsString()
  @IsNotEmpty({ message: 'El título del aviso es obligatorio' })
  title: string;

  @ApiProperty({ example: 'La circulación permanecerá restringida desde las 08:00.' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description: string;

  @ApiPropertyOptional({ enum: ['CRITICAL', 'WARNING', 'INFO'], default: 'INFO' })
  @IsString()
  @IsOptional()
  @IsIn(['CRITICAL', 'WARNING', 'INFO'])
  severity?: string;

  @ApiPropertyOptional({ enum: ['OFICIAL', 'VECINAL'], default: 'OFICIAL' })
  @IsString()
  @IsOptional()
  @IsIn(['OFICIAL', 'VECINAL'])
  sourceType?: string;

  @ApiPropertyOptional({ example: 'Municipalidad de Lules' })
  @IsString()
  @IsOptional()
  issuer?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsString()
  @IsOptional()
  barrio?: string;

  @ApiPropertyOptional({ example: 'Av. San Martín 250' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: -26.9254 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: -65.3378 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ example: '103' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '/uploads/notices/aviso.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}