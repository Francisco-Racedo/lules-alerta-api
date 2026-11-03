import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export type AlertChangeAction =
  | 'created'
  | 'status_changed'
  | 'resolved'
  | 'dismissed'
  | 'archived'
  | 'description_updated'
  | 'images_updated'
  | 'deleted';

interface WebSocketJwtPayload {
  sub?: unknown;
  role?: unknown;
}

const ADMIN_ROOM = 'monitoring:alerts';

@WebSocketGateway({ cors: { origin: '*' } })
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.getToken(client);
      const payload = await this.jwtService.verifyAsync<WebSocketJwtPayload>(
        token,
        { secret: this.configService.getOrThrow<string>('JWT_SECRET') },
      );

      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedException('El token WebSocket no es válido.');
      }

      await client.join(this.getUserRoom(payload.sub));
      if (payload.role === 'ADMIN') {
        await client.join(ADMIN_ROOM);
      }
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    return;
  }

  emitNewAlert(alert: object) {
    this.server.to(ADMIN_ROOM).emit('alert.created', alert);
  }

  emitMonitoringAlertChanged(
    alertId: string,
    action: AlertChangeAction,
    userId: string,
  ) {
    this.server.to(ADMIN_ROOM).emit('alert.changed', {
      alertId,
      action,
      userId,
    });
  }

  emitAlertChanged(
    userId: string,
    alertId: string,
    action: AlertChangeAction,
  ) {
    this.server.to(this.getUserRoom(userId)).emit('alert.changed', {
      alertId,
      action,
    });
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    const authorization = client.handshake.headers.authorization;
    const token = typeof authToken === 'string'
      ? authToken
      : typeof authorization === 'string'
        ? authorization.replace(/^Bearer\s+/i, '')
        : '';

    if (!token) {
      throw new UnauthorizedException('Falta el token WebSocket.');
    }

    return token;
  }
}