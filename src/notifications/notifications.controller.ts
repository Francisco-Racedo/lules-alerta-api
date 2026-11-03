import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../users/auth.types.js';
import { RegisterPushTokenDto } from './dto/register-push-token.dto.js';
import { RemovePushTokenDto } from './dto/remove-push-token.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications/push-token')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async registerToken(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return await this.notificationsService.registerToken(
      request.user.id,
      dto,
    );
  }

  @Delete()
  async removeToken(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RemovePushTokenDto,
  ) {
    return await this.notificationsService.removeToken(
      request.user.id,
      dto.token,
    );
  }
}
