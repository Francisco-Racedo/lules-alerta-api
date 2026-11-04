import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity.js';
import { AlertHistory } from './entities/alert-history.entity.js';
import { AlertResolution } from './entities/alert-resolution.entity.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { AlertsGateway } from './alerts.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(AlertHistory)
    private readonly historyRepository: Repository<AlertHistory>,
    @InjectRepository(AlertResolution)
    private readonly resolutionRepository: Repository<AlertResolution>,
    private readonly alertsGateway: AlertsGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createAlertDto: CreateAlertDto): Promise<Alert> {
    const {
      category,
      description,
      latitude,
      longitude,
      userId,
      address,
      imageUrl,
      images,
    } = createAlertDto;

    const finalImages = images?.length
      ? images
      : imageUrl
        ? [imageUrl]
        : [];

    const newAlert = this.alertRepository.create({
      category,
      description,
      userId,
      address,
      imageUrl,
      images: finalImages,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });

    const savedAlert = await this.alertRepository.save(newAlert);

    const historyEntry = this.historyRepository.create({
      alert: savedAlert,
      newStatus: 'PENDING',
      comment: 'Reporte emitido por el ciudadano',
    });

    await this.historyRepository.save(historyEntry);

    this.alertsGateway.emitNewAlert(savedAlert);
    void this.notificationsService.notifyAdministrators(
      savedAlert,
      'created',
      'Nuevo reporte ciudadano',
      `${category}: ${description}`,
    );

    return savedAlert;
  }

  async getNearbyAlerts(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<Alert[]> {
    return await this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.status = :status', { status: 'PENDING' })
      .andWhere(
        `ST_DWithin(
          alert.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
      )
      .setParameters({ lng, lat, radius })
      .getMany();
  }

  async updateStatus(
    id: string,
    status: string,
    comment?: string,
  ): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException(
        'La alerta con el ID especificado no existe.',
      );
    }

    if (alert.status !== status) {
      const historyEntry = this.historyRepository.create({
        alert,
        previousStatus: alert.status,
        newStatus: status,
        comment: comment || 'Actualización de estado por operador',
      });

      await this.historyRepository.save(historyEntry);

      alert.status = status;

      const updatedAlert = await this.alertRepository.save(alert);
      this.alertsGateway.emitAlertChanged(
        alert.userId,
        alert.id,
        'status_changed',
      );
      void this.notificationsService.notifyUser(
        alert.userId,
        alert,
        'status_changed',
        'Actualización de tu reporte',
        `Tu reporte de ${alert.category} cambió a ${status}.`,
      );
      return updatedAlert;
    }

    return alert;
  }

  async findAllPaginated(page: number, limit: number) {
    const [data, total] = await this.alertRepository.findAndCount({
      relations: {
        history: true,
        resolution: true,
      },
      order: {
        createdAt: 'DESC',
      },
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

  async updateImage(
    id: string,
    imageUrl: string,
    ownerUserId?: string,
  ): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException(
        'La alerta con el ID especificado no existe.',
      );
    }

    this.ensureOwner(alert, ownerUserId);
    alert.imageUrl = imageUrl;
    alert.images = [imageUrl];

    const updatedAlert = await this.alertRepository.save(alert);
    if (ownerUserId) {
      this.alertsGateway.emitMonitoringAlertChanged(
        alert.id,
        'images_updated',
        alert.userId,
      );
      void this.notificationsService.notifyAdministrators(
        alert,
        'images_updated',
        'Reporte actualizado',
        `Se actualizaron las imágenes de un reporte de ${alert.category}.`,
      );
    }
    return updatedAlert;
  }

  async updateImageAtIndex(
  id: string,
  imageIndex: number,
  imageUrl: string,
  ownerUserId?: string,
): Promise<Alert> {
  const alert = await this.alertRepository.findOne({
    where: { id },
  });

  if (!alert) {
    throw new NotFoundException(
      'La alerta con el ID especificado no existe.',
    );
  }

  this.ensureOwner(alert, ownerUserId);

  if (alert.status !== 'PENDING') {
    throw new BadRequestException(
      'Solo puedes cambiar imágenes de reportes pendientes.',
    );
  }

  const currentImages = alert.images?.length
    ? [...alert.images]
    : alert.imageUrl
      ? [alert.imageUrl]
      : [];

  if (
    !Number.isInteger(imageIndex) ||
    imageIndex < 0 ||
    imageIndex >= currentImages.length
  ) {
    throw new BadRequestException(
      'El índice de la imagen no es válido.',
    );
  }

  currentImages[imageIndex] = imageUrl;

  alert.images = currentImages;

  if (imageIndex === 0) {
    alert.imageUrl = imageUrl;
  }

  const updatedAlert = await this.alertRepository.save(alert);
  if (ownerUserId) {
    this.alertsGateway.emitMonitoringAlertChanged(
      alert.id,
      'images_updated',
      alert.userId,
    );
    void this.notificationsService.notifyAdministrators(
      alert,
      'images_updated',
      'Reporte actualizado',
      `Se actualizaron las imágenes de un reporte de ${alert.category}.`,
    );
  }
  return updatedAlert;
}

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 50,
    archived: string = 'false',
  ) {
    const isArchivedBool = archived === 'true';

    const [data, total] = await this.alertRepository.findAndCount({
      where: {
        userId,
        isArchived: isArchivedBool,
      },
      relations: {
        history: true,
        resolution: true,
      },
      order: {
        createdAt: 'DESC',
      },
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

  async remove(id: string, ownerUserId?: string): Promise<{ message: string }> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('La alerta no existe.');
    }

    this.ensureOwner(alert, ownerUserId);

    if (alert.status !== 'PENDING') {
      throw new BadRequestException(
        'No puedes cancelar una alerta que ya está en curso o resuelta.',
      );
    }

    await this.alertRepository.remove(alert);
    if (ownerUserId) {
      this.alertsGateway.emitMonitoringAlertChanged(
        alert.id,
        'deleted',
        alert.userId,
      );
      void this.notificationsService.notifyAdministrators(
        alert,
        'deleted',
        'Reporte cancelado',
        `Se canceló un reporte de ${alert.category}.`,
      );
    }

    return {
      message: 'Alerta cancelada y eliminada correctamente',
    };
  }

  async updateDescription(
    id: string,
    newDescription: string,
    ownerUserId?: string,
  ): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('La alerta no existe.');
    }

    this.ensureOwner(alert, ownerUserId);

    if (alert.status !== 'PENDING') {
      throw new BadRequestException(
        'No puedes modificar una alerta que ya está en curso o resuelta.',
      );
    }

    alert.description = newDescription;

    const updatedAlert = await this.alertRepository.save(alert);
    if (ownerUserId) {
      this.alertsGateway.emitMonitoringAlertChanged(
        alert.id,
        'description_updated',
        alert.userId,
      );
      void this.notificationsService.notifyAdministrators(
        alert,
        'description_updated',
        'Reporte actualizado',
        `Se modificó la descripción de un reporte de ${alert.category}.`,
      );
    }
    return updatedAlert;
  }

  async resolveAlert(
    id: string,
    description: string,
    imageUrls: string[] = [],
    finalStatus: 'RESOLVED' | 'DISMISSED' = 'RESOLVED',
  ): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('La alerta no existe.');
    }

    if (
      alert.status === 'RESOLVED' ||
      alert.status === 'DISMISSED'
    ) {
      throw new BadRequestException('Esta alerta ya fue cerrada.');
    }

    const resolution = this.resolutionRepository.create({
      alert,
      description,
      imageUrl: imageUrls[0],
      images: imageUrls,
    });

    await this.resolutionRepository.save(resolution);

    const historyEntry = this.historyRepository.create({
      alert,
      previousStatus: alert.status,
      newStatus: finalStatus,
      comment:
        finalStatus === 'RESOLVED'
          ? 'Resolución oficial de la autoridad'
          : 'Reporte descartado por la autoridad',
    });

    await this.historyRepository.save(historyEntry);

    alert.status = finalStatus;

    const updatedAlert = await this.alertRepository.save(alert);
    this.alertsGateway.emitAlertChanged(
      alert.userId,
      alert.id,
      finalStatus === 'RESOLVED' ? 'resolved' : 'dismissed',
    );
    void this.notificationsService.notifyUser(
      alert.userId,
      alert,
      finalStatus === 'RESOLVED' ? 'resolved' : 'dismissed',
      finalStatus === 'RESOLVED'
        ? 'Reporte resuelto'
        : 'Reporte descartado',
      finalStatus === 'RESOLVED'
        ? 'La autoridad resolvió tu reporte.'
        : 'La autoridad descartó tu reporte.',
    );
    return updatedAlert;
  }

  async archiveAlert(
    id: string,
    ownerUserId?: string,
  ): Promise<{ message: string }> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('El reporte no existe.');
    }

    this.ensureOwner(alert, ownerUserId);

    if (
      alert.status !== 'RESOLVED' &&
      alert.status !== 'DISMISSED'
    ) {
      throw new BadRequestException(
        'Solo puedes archivar reportes que ya estén resueltos o descartados.',
      );
    }

    alert.isArchived = true;
    alert.archivedAt = new Date();

    await this.alertRepository.save(alert);
    if (ownerUserId) {
      this.alertsGateway.emitMonitoringAlertChanged(
        alert.id,
        'archived',
        alert.userId,
      );
    } else {
      this.alertsGateway.emitAlertChanged(alert.userId, alert.id, 'archived');
    }

    return {
      message: 'Reporte archivado correctamente',
    };
  }

  private ensureOwner(alert: Alert, ownerUserId?: string): void {
    if (ownerUserId && alert.userId !== ownerUserId) {
      throw new ForbiddenException(
        'No tienes permisos para modificar este reporte.',
      );
    }
  }
}