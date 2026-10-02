import { IsString, IsNotEmpty, IsNumber, IsUUID, Min, Max, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlertDto {
  @ApiProperty({ description: 'Descripción del incidente', example: 'Accidente de tránsito en la avenida principal' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Latitud', example: -26.9215 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitud', example: -65.3392 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'ID del usuario que reporta', example: 'TU_USER_ID_AQUI' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  // NUEVO: Validación de la dirección legible
  @ApiPropertyOptional({ description: 'Dirección aproximada (Reverse Geocoding)', example: 'Av. San Martín y 9 de Julio, Lules' })
  @IsString()
  @IsOptional()
  address?: string;

  // NUEVO: Validación de la URL de la imagen
  @ApiPropertyOptional({ description: 'URL de la fotografía adjunta', example: 'https://storage.midominio.com/foto123.jpg' })
  @IsUrl({}, { message: 'El campo imageUrl debe ser un enlace web válido' })
  @IsOptional()
  imageUrl?: string;
}