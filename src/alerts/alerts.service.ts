import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { AlertsGateway } from './alerts.gateway.js';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async create(createAlertDto: CreateAlertDto): Promise<Alert> {
    // Extraemos los nuevos campos opcionales del DTO
    const { description, latitude, longitude, userId, address, imageUrl } = createAlertDto;

    const newAlert = this.alertRepository.create({
      description,
      userId,
      address,   // Agregado
      imageUrl,  // Agregado
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });

    const savedAlert = await this.alertRepository.save(newAlert);
    
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

  async updateStatus(id: string, status: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    
    if (!alert) {
      throw new NotFoundException(`La alerta con el ID especificado no existe.`);
    }

    alert.status = status;
    return await this.alertRepository.save(alert);
  }

  async findAllPaginated(page: number, limit: number) {
    const [data, total] = await this.alertRepository.findAndCount({
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
}