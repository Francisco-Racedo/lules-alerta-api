import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class PasswordResetMailerService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const user = configService.getOrThrow<string>('SMTP_USER');
    const password = configService.getOrThrow<string>('SMTP_PASSWORD');
    const host = configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
    const port = configService.get<number>('SMTP_PORT') ?? 465;
    const secure = configService.get<string>('SMTP_SECURE') !== 'false';
    const fromName =
      configService.get<string>('SMTP_FROM_NAME') ?? 'Lules Alerta';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });
    this.from = `"${fromName}" <${user}>`;
  }

  async sendPasswordResetCode(
    recipient: string,
    code: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipient,
        subject: 'Código para recuperar tu contraseña',
        text: [
          'Recibimos una solicitud para recuperar tu contraseña de Lules Alerta.',
          '',
          `Tu código es: ${code}`,
          'Este código vence en 10 minutos y solo puede utilizarse una vez.',
          '',
          'Si no solicitaste este cambio, puedes ignorar este mensaje.',
        ].join('\n'),
      });
    } catch {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación.',
      );
    }
  }
}
