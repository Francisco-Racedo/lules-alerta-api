import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { PasswordResetCode } from './entities/password-reset-code.entity.js';
import { PasswordResetMailerService } from './password-reset-mailer.service.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const userRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const passwordResetRepository = {
    update: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
  };

  const passwordResetMailer = {
    sendPasswordResetCode: vi.fn(),
  };

  const jwtService = {
    sign: vi.fn(),
  };

  const createUser = (overrides: Partial<User> = {}): User =>
    Object.assign(new User(), {
      id: 'user-id',
      dni: '35123456',
      nombre: 'Juan Pérez',
      telefono: '3811234567',
      password: 'hashed-password',
      fotoPerfil: '/uploads/avatars/user.jpg',
      ...overrides,
    });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetCode),
          useValue: passwordResetRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: PasswordResetMailerService,
          useValue: passwordResetMailer,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('login', () => {
    it('autentica al usuario y devuelve un token sin la contraseña', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('signed-token');

      const result = await service.login({
        dni: user.dni,
        password: 'plain-password',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'plain-password',
        user.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        dni: user.dni,
      });
      expect(result).toEqual({
        access_token: 'signed-token',
        user: {
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
        },
      });
    });

    it('rechaza un DNI inexistente', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ dni: '35123456', password: 'password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza una contraseña incorrecta', async () => {
      userRepository.findOne.mockResolvedValue(createUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({ dni: '35123456', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('findPublicById', () => {
    it('devuelve los datos públicos del usuario', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.findPublicById(user.id)).resolves.toEqual({
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
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
      });

    });

    it('rechaza un usuario de sesión inexistente', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findPublicById('missing-user'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    describe('requestPasswordReset', () => {
      it('no revela si el DNI no tiene una cuenta recuperable', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await expect(
          service.requestPasswordReset({ dni: '35123456' }),
        ).resolves.toEqual({
          message:
            'Si los datos son válidos, recibirás un código en tu correo registrado.',
        });

        expect(passwordResetMailer.sendPasswordResetCode).not.toHaveBeenCalled();
      });

      it('genera y envía un código para un usuario con correo', async () => {
        const user = createUser({ email: 'user@example.com' });
        const resetCode = Object.assign(new PasswordResetCode(), {
          userId: user.id,
          codeHash: 'code-hash',
        });
        userRepository.findOne.mockResolvedValue(user);
        passwordResetRepository.create.mockReturnValue(resetCode);

        await expect(
          service.requestPasswordReset({ dni: user.dni }),
        ).resolves.toEqual({
          message:
            'Si los datos son válidos, recibirás un código en tu correo registrado.',
        });

        expect(passwordResetRepository.update).toHaveBeenCalled();
        expect(passwordResetRepository.save).toHaveBeenCalledWith(resetCode);
        expect(passwordResetMailer.sendPasswordResetCode).toHaveBeenCalledWith(
          user.email,
          expect.stringMatching(/^\d{6}$/),
        );
      });
    });

    describe('confirmPasswordReset', () => {
      it('rechaza un código inexistente', async () => {
        userRepository.findOne.mockResolvedValue(createUser());
        passwordResetRepository.findOne.mockResolvedValue(null);

        await expect(
          service.confirmPasswordReset({
            dni: '35123456',
            code: '123456',
            newPassword: 'new-password',
          }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });

      it('actualiza la contraseña y marca el código como utilizado', async () => {
        const user = createUser();
        const resetCode = Object.assign(new PasswordResetCode(), {
          userId: user.id,
          codeHash: createHash('sha256').update('123456').digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
          usedAt: null,
          createdAt: new Date(),
        });
        userRepository.findOne.mockResolvedValue(user);
        passwordResetRepository.findOne.mockResolvedValue(resetCode);
        vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

        await expect(
          service.confirmPasswordReset({
            dni: user.dni,
            code: '123456',
            newPassword: 'new-password',
          }),
        ).resolves.toEqual({
          message: 'La contraseña se actualizó correctamente.',
        });

        expect(user.password).toBe('new-hash');
        expect(resetCode.usedAt).toBeInstanceOf(Date);
        expect(userRepository.save).toHaveBeenCalledWith(user);
        expect(passwordResetRepository.save).toHaveBeenCalledWith(resetCode);
      });
    });
  });
});
