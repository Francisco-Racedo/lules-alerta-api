import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { Alert } from './entities/alert.entity.js';
import { AlertHistory } from './entities/alert-history.entity.js';
import { AlertsGateway } from './alerts.gateway.js'; // <-- Importamos el Gateway
import { AlertResolution } from './entities/alert-resolution.entity.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, AlertHistory, AlertResolution]),
    UsersModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsGateway], // <-- Lo agregamos como proveedor
})
export class AlertsModule {}