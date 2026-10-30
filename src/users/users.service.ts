import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto.js';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto.js';
import { PasswordResetCode } from './entities/password-reset-code.entity.js';
import { PasswordResetMailerService } from './password-reset-mailer.service.js';
import { randomInt, createHash } from 'node:crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetCode)
    private readonly passwordResetRepository: Repository<PasswordResetCode>,
    private readonly jwtService: JwtService, // Herramienta para emitir Tokens
    private readonly passwordResetMailer: PasswordResetMailerService,
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
      user: await this.findPublicById(user.id),
    };
  }

  async findPublicById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('El usuario de la sesión no existe.');
    }

    return {
      id: user.id,
      nombre: user.nombre,
      dni: user.dni,
      telefono: user.telefono,
      fotoPerfil: user.fotoPerfil,
      email: user.email,
      direccion: user.direccion,
      barrio: user.barrio,
      contactoEmergenciaNombre: user.contactoEmergenciaNombre,
      contactoEmergenciaTelefono: user.contactoEmergenciaTelefono,
      datosMedicos: user.datosMedicos,
    };
  }

  async requestPasswordReset(
    request: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'Si los datos son válidos, recibirás un código en tu correo registrado.',
    };
    const user = await this.userRepository.findOne({
      where: { dni: request.dni },
    });

    if (!user || !user.email) {
      return genericResponse;
    }

    await this.passwordResetRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const code = randomInt(100000, 1000000).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const resetCode = this.passwordResetRepository.create({
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      usedAt: null,
    });

    await this.passwordResetRepository.save(resetCode);
    await this.passwordResetMailer.sendPasswordResetCode(user.email, code);

    return genericResponse;
  }

  async confirmPasswordReset(
    request: ConfirmPasswordResetDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { dni: request.dni },
    });

    if (!user) {
      throw new UnauthorizedException('El código de recuperación no es válido.');
    }

    const resetCode = await this.passwordResetRepository.findOne({
      where: {
        userId: user.id,
        usedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    if (
      !resetCode ||
      resetCode.expiresAt.getTime() <= Date.now() ||
      resetCode.attempts >= 5
    ) {
      throw new UnauthorizedException('El código de recuperación no es válido.');
    }

    const codeHash = createHash('sha256')
      .update(request.code)
      .digest('hex');

    if (codeHash !== resetCode.codeHash) {
      resetCode.attempts += 1;
      await this.passwordResetRepository.save(resetCode);
      throw new UnauthorizedException('El código de recuperación no es válido.');
    }

    user.password = await bcrypt.hash(request.newPassword, 10);
    resetCode.usedAt = new Date();
    await this.userRepository.save(user);
    await this.passwordResetRepository.save(resetCode);

    return {
      message: 'La contraseña se actualizó correctamente.',
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

  // --- NUEVO MÉTODO AGREGADO: Guardar Fotografía de Perfil ---
  async updateAvatar(id: string, fotoUrl: string) {
    const user = await this.userRepository.preload({
      id: id,
      fotoPerfil: fotoUrl,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado en el sistema`);
    }

    return await this.userRepository.save(user);
  }
}