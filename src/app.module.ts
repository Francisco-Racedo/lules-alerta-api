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
    // 2. Inyectamos las variables usando process.env
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Alert],
      synchronize: true, 
      logging: false, // Desactivamos el logging para mantener la terminal limpia
    }),
    UsersModule,
    AlertsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}