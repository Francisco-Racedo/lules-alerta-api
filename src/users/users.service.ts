import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService, // Herramienta para emitir Tokens
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const { password, ...userData } = createUserDto;
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = this.userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      return await this.userRepository.save(newUser);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Este DNI ya se encuentra registrado en el sistema.');
      }
      throw new InternalServerErrorException('Ocurrió un error al crear la cuenta. Inténtalo nuevamente.');
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { dni, password } = loginUserDto;

    // 1. Buscamos al usuario por DNI
    const user = await this.userRepository.findOne({ where: { dni } });
    
    // Si no existe, lanzamos error genérico por seguridad (para no dar pistas a atacantes)
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2. Comparamos la contraseña enviada con la encriptada en la base de datos
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. ¡Identidad confirmada! Generamos el Token JWT ("Pase VIP")
    const payload = { sub: user.id, dni: user.dni };
    const token = this.jwtService.sign(payload);

    // Devolvemos el token y los datos del ciudadano (sin devolver la contraseña)
    return {
      access_token: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        dni: user.dni,
        telefono: user.telefono
      }
    };
  }

  // Nuevo método para actualizar datos
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.preload({
      id: id,
      ...updateUserDto,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado en el sistema`);
    }

    return await this.userRepository.save(user);
  }
}