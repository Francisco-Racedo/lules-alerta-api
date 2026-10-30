import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @Matches(/^\d{7,8}$/, {
    message: 'El DNI debe tener entre 7 y 8 dígitos',
  })
  dni: string;
}
