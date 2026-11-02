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
  | 'status_changed'
  | 'resolved'
  | 'dismissed'
  | 'archived';

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
      const payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(
        token,
        { secret: this.configService.getOrThrow<string>('JWT_SECRET') },
      );

      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedException('El token WebSocket no es válido.');
      }

      await client.join(this.getUserRoom(payload.sub));
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    return;
  }

  emitNewAlert(alert: object) {
    this.server.emit('nueva-alerta', alert);
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