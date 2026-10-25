import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UsersModule } from './users/users.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { User } from './users/entities/user.entity.js';
import { Alert } from './alerts/entities/alert.entity.js';
import { NoticesModule } from './notices/notices.module.js';
import { Notice } from './notices/entities/notice.entity.js';

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
    // 2. Conexión a Base de Datos compatible con Local y Producción (DATABASE_URL)
    // 2. Conexión a Base de Datos compatible con Local y Producción (DATABASE_URL)
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || undefined,
      host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
      port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DATABASE_URL ? undefined : process.env.DB_USERNAME,
      password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
      database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
      entities: [User, Alert, Notice],
      synchronize: true, 
      logging: false,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    // 3. Habilitar carpeta pública para las fotografías de perfil y alertas
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    UsersModule,
    AlertsModule,
    NoticesModule,
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