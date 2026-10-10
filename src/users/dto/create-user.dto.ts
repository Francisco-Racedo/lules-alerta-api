import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @MinLength(7, { message: 'El DNI debe tener al menos 7 números' })
  @MaxLength(8)
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(20)
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}