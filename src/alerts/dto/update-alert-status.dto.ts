import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateAlertStatusDto {
  @IsString()
  @IsNotEmpty()
  // @IsIn garantiza que solo se acepten estos tres valores exactos
  @IsIn(['PENDING', 'RESOLVED', 'DISMISSED'])
  status: string;
}