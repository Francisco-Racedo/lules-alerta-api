import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { User } from './users/entities/user.entity.js';
import { Alert } from './alerts/entities/alert.entity.js';

@Module({
  imports: [
    // 1. Inicializamos el módulo de configuración para leer el .env
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    // 2. Usamos directamente la URL completa de conexión (compatible con Render y Supabase)
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
  providers: [],
})
export class AppModule {}