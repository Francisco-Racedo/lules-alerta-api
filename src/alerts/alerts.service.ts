import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity.js';
import { AlertHistory } from './entities/alert-history.entity.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { AlertsGateway } from './alerts.gateway.js';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(AlertHistory)
    private readonly historyRepository: Repository<AlertHistory>,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async create(createAlertDto: CreateAlertDto): Promise<Alert> {
    const { category, description, latitude, longitude, userId, address, imageUrl } = createAlertDto;

    const newAlert = this.alertRepository.create({
      category,
      description,
      userId,
      address,
      imageUrl,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });

    const savedAlert = await this.alertRepository.save(newAlert);
    
    // NUEVO: Registrar el evento de creación inicial en el historial
    const historyEntry = this.historyRepository.create({
      alert: savedAlert,
      newStatus: 'PENDING',
      comment: 'Reporte emitido por el ciudadano',
    });
    await this.historyRepository.save(historyEntry);

    // Emitimos la alerta recién guardada a todos los conectados
    this.alertsGateway.emitNewAlert(savedAlert);

    return savedAlert;
  }

  async getNearbyAlerts(lat: number, lng: number, radius: number): Promise<Alert[]> {
    return await this.alertRepository
      .createQueryBuilder('alert')
      .where("alert.status = :status", { status: 'PENDING' })
      .andWhere(
        `ST_DWithin(
          alert.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`
      )
      .setParameters({ lng, lat, radius })
      .getMany();
  }

  // MODIFICADO: Ahora guarda el historial de cambios de estado
  async updateStatus(id: string, status: string, comment: string = 'Actualización por operador'): Promise<Alert> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    
    if (!alert) {
      throw new NotFoundException(`La alerta con el ID especificado no existe.`);
    }

    // Solo creamos registro si el estado es diferente al actual
    if (alert.status !== status) {
      const historyEntry = this.historyRepository.create({
        alert: alert,
        previousStatus: alert.status,
        newStatus: status,
        comment: comment,
      });
      await this.historyRepository.save(historyEntry);
      
      alert.status = status;
      return await this.alertRepository.save(alert);
    }

    return alert;
  }

  async findAllPaginated(page: number, limit: number) {
    const [data, total] = await this.alertRepository.findAndCount({
      relations: { history: true }, // <-- CORRECCIÓN APLICADA AQUÍ
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data,
      total,
      currentPage: page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async updateImage(id: string, imageUrl: string): Promise<Alert> {
    const alert = await this.alertRepository.preload({
      id: id,
      imageUrl: imageUrl,
    });

    if (!alert) {
      throw new NotFoundException(`La alerta con el ID especificado no existe.`);
    }

    return await this.alertRepository.save(alert);
  }

  async findByUserId(userId: string, page: number = 1, limit: number = 10) {
    const [data, total] = await this.alertRepository.findAndCount({
      where: { userId },
      relations: { history: true }, // <-- CORRECCIÓN APLICADA AQUÍ
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data,
      total,
      currentPage: page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('La alerta no existe.');
    }
    if (alert.status !== 'PENDING') {
      throw new BadRequestException('No puedes cancelar una alerta que ya está en curso o resuelta.');
    }
    
    await this.alertRepository.remove(alert);
    return { message: 'Alerta cancelada y eliminada correctamente' };
  }

  async updateDescription(id: string, newDescription: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('La alerta no existe.');
    }
    if (alert.status !== 'PENDING') {
      throw new BadRequestException('No puedes modificar una alerta que ya está en curso o resuelta.');
    }

    alert.description = newDescription;
    return await this.alertRepository.save(alert);
  }
}