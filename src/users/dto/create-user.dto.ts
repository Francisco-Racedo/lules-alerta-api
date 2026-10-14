import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @MaxLength(8)
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(20)
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'Debe tener al menos 6 caracteres' })
  password: string;

  // --- A PARTIR DE AQUÍ LOS HACEMOS OPCIONALES ---

  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @IsOptional() // <-- Esta es la clave
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsOptional() // <-- Esta es la clave
  @MaxLength(255)
  direccion?: string;

  @IsString()
  @IsOptional() // <-- Esta es la clave
  @MaxLength(100)
  barrio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactoEmergenciaNombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactoEmergenciaTelefono?: string;

  @IsString()
  @IsOptional()
  datosMedicos?: string;
}