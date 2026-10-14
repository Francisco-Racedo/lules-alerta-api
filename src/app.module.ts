import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static'; // NUEVA IMPORTACIÓN
import { join } from 'path'; // NUEVA IMPORTACIÓN
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
    // 2. Conexión a Base de Datos corregida para entorno local
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Alert],
      synchronize: true, 
      logging: false,
    }),
    // 3. NUEVO: Habilitar carpeta pública para las fotografías de perfil
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
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