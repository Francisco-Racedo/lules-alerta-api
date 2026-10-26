import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateAlertStatusDto {
  @IsString()
  @IsNotEmpty()
  // @IsIn garantiza que solo se acepten estos cuatro valores exactos
  @IsIn(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'])
  status: string;
}