import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = {
    login: vi.fn(),
    findPublicById: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('delega el login en el servicio', async () => {
    const credentials = {
      dni: '35123456',
      password: 'password',
    };
    const expectedResponse = {
      access_token: 'signed-token',
      user: { id: 'user-id' },
    };
    usersService.login.mockResolvedValue(expectedResponse);

    await expect(controller.login(credentials)).resolves.toBe(
      expectedResponse,
    );
    expect(usersService.login).toHaveBeenCalledWith(credentials);
  });

  it('obtiene el usuario actual desde la identidad validada por el guard', async () => {
    const request = {
      user: {
        id: 'user-id',
        dni: '35123456',
      },
    } as AuthenticatedRequest;
    const expectedUser = {
      id: 'user-id',
      nombre: 'Juan Pérez',
    };
    usersService.findPublicById.mockResolvedValue(expectedUser);

    await expect(controller.getCurrentUser(request)).resolves.toBe(
      expectedUser,
    );
    expect(usersService.findPublicById).toHaveBeenCalledWith('user-id');
  });

  it('delega la solicitud de recuperación', async () => {
    const request = { dni: '35123456' };
    const response = { message: 'Solicitud procesada.' };
    usersService.requestPasswordReset.mockResolvedValue(response);

    await expect(controller.requestPasswordReset(request)).resolves.toBe(
      response,
    );
    expect(usersService.requestPasswordReset).toHaveBeenCalledWith(request);
  });

  it('delega la confirmación de recuperación', async () => {
    const request = {
      dni: '35123456',
      code: '123456',
      newPassword: 'new-password',
    };
    const response = { message: 'La contraseña se actualizó correctamente.' };
    usersService.confirmPasswordReset.mockResolvedValue(response);

    await expect(controller.confirmPasswordReset(request)).resolves.toBe(
      response,
    );
    expect(usersService.confirmPasswordReset).toHaveBeenCalledWith(request);
  });
});
