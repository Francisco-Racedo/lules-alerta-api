import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAlertStatusDto {
  @ApiProperty({ example: 'IN_PROGRESS', description: 'Nuevo estado de la alerta' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 'Cuadrilla en camino', description: 'Comentario opcional para el historial', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}