import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';

export class ConfirmPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @Matches(/^\d{7,8}$/, {
    message: 'El DNI debe tener entre 7 y 8 dígitos',
  })
  dni: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'El código debe tener 6 dígitos',
  })
  code: string;

  @IsString()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres',
  })
  newPassword: string;
}
