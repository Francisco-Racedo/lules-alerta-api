import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class PasswordResetMailerService {
  private readonly logger = new Logger(PasswordResetMailerService.name);
  private readonly gmail?: ReturnType<typeof google.gmail>;
  private readonly smtpTransporter?: Transporter;
  private readonly sender: string;

  constructor(configService: ConfigService) {
    this.sender =
      configService.get<string>('GMAIL_SENDER') ||
      configService.get<string>('SMTP_FROM') ||
      configService.get<string>('SMTP_USER') ||
      'no-reply@lulesalerta.gob.ar';

    // 1. Configurar cliente Google OAuth2 si las credenciales están presentes
    const clientId = configService.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = configService.get<string>('GMAIL_CLIENT_SECRET');
    const refreshToken = configService.get<string>('GMAIL_REFRESH_TOKEN');

    if (clientId && clientSecret && refreshToken) {
      try {
        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });
        this.gmail = google.gmail({ version: 'v1', auth });
        this.logger.log('Servicio Gmail OAuth2 configurado.');
      } catch (err: any) {
        this.logger.warn(`Error inicializando Gmail OAuth2: ${err?.message}`);
      }
    }

    // 2. Configurar transportador SMTP / Nodemailer si está configurado
    const smtpHost = configService.get<string>('SMTP_HOST');
    const smtpPort = configService.get<number>('SMTP_PORT', 587);
    const smtpUser =
      configService.get<string>('SMTP_USER') ||
      configService.get<string>('GMAIL_USER') ||
      this.sender;
    const smtpPass =
      configService.get<string>('SMTP_PASS') ||
      configService.get<string>('GMAIL_APP_PASSWORD');

    if (smtpPass) {
      try {
        if (smtpHost) {
          this.smtpTransporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });
        } else {
          // Gmail SMTP directo con Contraseña de Aplicación
          this.smtpTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });
        }
        this.logger.log('Servidor SMTP Nodemailer configurado.');
      } catch (err: any) {
        this.logger.warn(`Error inicializando Nodemailer SMTP: ${err?.message}`);
      }
    }
  }

  async sendPasswordResetCode(
    recipient: string,
    code: string,
  ): Promise<void> {
    const subject = 'Código para recuperar tu contraseña - Lules Alerta';
    const messageBody = [
      'Recibimos una solicitud para recuperar tu contraseña de Lules Alerta.',
      '',
      `Tu código de verificación es: ${code}`,
      '',
      'Este código vence en 10 minutos y solo puede utilizarse una vez.',
      '',
      'Si no solicitaste este cambio, puedes ignorar este mensaje de manera segura.',
    ].join('\n');

    // Registrar en los logs para trazabilidad y entorno de desarrollo / soporte municipal
    this.logger.log(`🔑 [PASSWORD_RESET] Solicitud de código para ${recipient}: ${code}`);

    let mailSent = false;
    let lastError: any = null;

    // Intento 1: Nodemailer SMTP si está configurado (método más estable)
    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          from: this.sender,
          to: recipient,
          subject,
          text: messageBody,
        });
        this.logger.log(`Correo de recuperación enviado exitosamente vía SMTP a ${recipient}`);
        mailSent = true;
      } catch (err: any) {
        this.logger.error(`Fallo envío vía SMTP a ${recipient}: ${err?.message}`, err?.stack);
        lastError = err;
      }
    }

    // Intento 2: Gmail OAuth2 si SMTP no envió o no está configurado
    if (!mailSent && this.gmail) {
      try {
        const rawMessage = [
          `From: ${this.sender}`,
          `To: ${recipient}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          messageBody,
        ].join('\r\n');

        await this.gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: Buffer.from(rawMessage, 'utf8')
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, ''),
          },
        });
        this.logger.log(`Correo de recuperación enviado exitosamente vía Gmail API a ${recipient}`);
        mailSent = true;
      } catch (err: any) {
        this.logger.error(`Fallo envío vía Gmail API a ${recipient}: ${err?.message}`, err?.stack);
        lastError = err;
      }
    }

    if (!mailSent) {
      this.logger.error(
        `No se pudo enviar el correo a ${recipient}. Detalle del error: ${lastError?.message || 'Sin transporte de correo disponible'}. Código generado: ${code}`,
      );
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación. Por favor intenta más tarde o contacta al soporte municipal.',
      );
    }
  }
}
