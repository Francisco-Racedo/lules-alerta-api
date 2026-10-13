import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
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
  providers: [UsersService],
  exports: [TypeOrmModule],
})
export class UsersModule {}