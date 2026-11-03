import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken } from './entities/push-token.entity.js';
import { RegisterPushTokenDto } from './dto/register-push-token.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
  ) {}

  async registerToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<{ message: string }> {
    let pushToken = await this.pushTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (pushToken) {
      pushToken.userId = userId;
      pushToken.platform = dto.platform;
      pushToken.isActive = true;
      pushToken.lastUsedAt = new Date();
    } else {
      pushToken = this.pushTokenRepository.create({
        userId,
        token: dto.token,
        platform: dto.platform,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    await this.pushTokenRepository.save(pushToken);

    return { message: 'Token push registrado correctamente.' };
  }

  async removeToken(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const pushToken = await this.pushTokenRepository.findOne({
      where: { userId, token },
    });

    if (pushToken) {
      pushToken.isActive = false;
      await this.pushTokenRepository.save(pushToken);
    }

    return { message: 'Token push desactivado correctamente.' };
  }
}
