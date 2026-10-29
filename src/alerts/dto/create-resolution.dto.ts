import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResolutionDto {
  @ApiProperty({
    description:
      'Informe oficial de la cuadrilla o autoridad detallando el trabajo realizado.',
    example:
      'Se reparó el bache con asfalto en frío y se limpió la calzada.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description:
      'Rutas de las fotografías de resolución generadas por el servidor.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}