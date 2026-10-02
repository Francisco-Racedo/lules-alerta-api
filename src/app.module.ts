import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './users/users.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { User } from './users/entities/user.entity.js';
import { Alert } from './alerts/entities/alert.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    // 1. Protección contra ataques de fuerza bruta y spam de peticiones
    ThrottlerModule.forRoot([{
      ttl: 60000, // Tiempo en milisegundos (60 segundos)
      limit: 10,  // Máximo 10 peticiones permitidas por IP en ese lapso
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
      entities: [User, Alert],
      synchronize: true, 
      logging: false,
    }),
    UsersModule,
    AlertsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Aplica el límite de velocidad de forma global en toda la API
    },
  ],
})
export class AppModule {}