import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';

import { JwtStrategy } from './jwt.strategy.js';
import { User } from './entities/user.entity.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const userRepository = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('devuelve la identidad del usuario existente', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-id',
      dni: '35123456',
    });

    await expect(
      strategy.validate({ sub: 'user-id', dni: '35123456' }),
    ).resolves.toEqual({
      id: 'user-id',
      dni: '35123456',
    });

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: { id: true, dni: true },
    });
  });

  it('rechaza un payload incompleto', async () => {
    await expect(
      strategy.validate({ sub: 'user-id' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un usuario inexistente o con DNI diferente', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'user-id', dni: '35123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
