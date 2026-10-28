import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResolutionDto {
  @ApiProperty({ 
    description: 'Informe oficial de la cuadrilla o autoridad detallando el trabajo realizado.',
    example: 'Se reparó el bache con asfalto en frío y se limpió la calzada.' 
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}