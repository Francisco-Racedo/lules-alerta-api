import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { Alert } from './entities/alert.entity.js';
import { AlertsGateway } from './alerts.gateway.js'; // <-- Importamos el Gateway

@Module({
  imports: [TypeOrmModule.forFeature([Alert])],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsGateway], // <-- Lo agregamos como proveedor
})
export class AlertsModule {}