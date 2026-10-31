import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordResetCode } from './entities/password-reset-code.entity.js';
import { PasswordResetMailerService } from './password-reset-mailer.service.js';
import { AdminGuard } from './admin.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordResetCode]),
    PassportModule,
    // Inyectamos el módulo JWT configurándolo con tu llave secreta
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' }, // El token será válido por 30 días
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    PasswordResetMailerService,
  ],
  exports: [TypeOrmModule, JwtAuthGuard, AdminGuard],
})
export class UsersModule {}