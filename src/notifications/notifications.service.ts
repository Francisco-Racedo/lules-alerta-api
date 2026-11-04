import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushToken } from './entities/push-token.entity.js';
import { RegisterPushTokenDto } from './dto/register-push-token.dto.js';
import { User } from '../users/entities/user.entity.js';
import type { Alert } from '../alerts/entities/alert.entity.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^(Expo|Exponent)PushToken\[[^\]]+\]$/;

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: {
    alertId: string;
    action: string;
  };
  sound: 'default';
};

type ExpoPushResponse = {
  data?: Array<{
    status?: string;
    details?: { error?: string };
  }>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async notifyAdministrators(
    alert: Pick<Alert, 'id' | 'category' | 'description'>,
    action: string,
    title: string,
    body: string,
  ): Promise<void> {
    const administrators = await this.userRepository.find({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    await this.sendToUsers(
      administrators.map(({ id }) => id),
      alert,
      action,
      title,
      body,
    );
  }

  async notifyUser(
    userId: string,
    alert: Pick<Alert, 'id' | 'category' | 'description'>,
    action: string,
    title: string,
    body: string,
  ): Promise<void> {
    await this.sendToUsers([userId], alert, action, title, body);
  }

  private async sendToUsers(
    userIds: string[],
    alert: Pick<Alert, 'id' | 'category' | 'description'>,
    action: string,
    title: string,
    body: string,
  ): Promise<void> {
    try {
      if (userIds.length === 0) {
        return;
      }

      const tokens = await this.pushTokenRepository.find({
        where: {
          userId: In(userIds),
          isActive: true,
        },
      });

      const validTokens = tokens.filter(({ token }) =>
        EXPO_TOKEN_PATTERN.test(token),
      );
      if (validTokens.length === 0) {
        return;
      }

      const messages: PushMessage[] = validTokens.map(({ token }) => ({
        to: token,
        title,
        body,
        data: { alertId: alert.id, action },
        sound: 'default',
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`Expo Push Service respondió HTTP ${response.status}.`);
      }

      const result = (await response.json()) as ExpoPushResponse;
      const invalidTokens = validTokens.filter(
        (_, index) =>
          result.data?.[index]?.details?.error === 'DeviceNotRegistered',
      );

      if (invalidTokens.length > 0) {
        await this.pushTokenRepository.update(
          { token: In(invalidTokens.map(({ token }) => token)) },
          { isActive: false },
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudieron enviar notificaciones para el reporte ${alert.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
