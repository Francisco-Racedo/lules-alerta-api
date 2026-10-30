import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class PasswordResetMailerService {
  private readonly gmail;
  private readonly sender: string;

  constructor(configService: ConfigService) {
    const auth = new google.auth.OAuth2(
      configService.getOrThrow<string>('GMAIL_CLIENT_ID'),
      configService.getOrThrow<string>('GMAIL_CLIENT_SECRET'),
    );
    auth.setCredentials({
      refresh_token: configService.getOrThrow<string>('GMAIL_REFRESH_TOKEN'),
    });
    this.gmail = google.gmail({ version: 'v1', auth });
    this.sender = configService.getOrThrow<string>('GMAIL_SENDER');
  }

  async sendPasswordResetCode(
    recipient: string,
    code: string,
  ): Promise<void> {
    try {
      const message = [
        `From: ${this.sender}`,
        `To: ${recipient}`,
        'Subject: Código para recuperar tu contraseña',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        [
          'Recibimos una solicitud para recuperar tu contraseña de Lules Alerta.',
          '',
          `Tu código es: ${code}`,
          'Este código vence en 10 minutos y solo puede utilizarse una vez.',
          '',
          'Si no solicitaste este cambio, puedes ignorar este mensaje.',
        ].join('\n'),
      ].join('\r\n');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(message, 'utf8')
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, ''),
        },
      });
    } catch {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación.',
      );
    }
  }
}
