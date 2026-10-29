import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Repository } from 'typeorm';

import { AlertsService } from './alerts.service.js';
import { AlertsGateway } from './alerts.gateway.js';
import { Alert } from './entities/alert.entity.js';
import { AlertHistory } from './entities/alert-history.entity.js';
import { AlertResolution } from './entities/alert-resolution.entity.js';

describe('AlertsService', () => {
  let service: AlertsService;

  const alertRepository = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    findAndCount: vi.fn(),
    remove: vi.fn(),
  };

  const historyRepository = {
    create: vi.fn(),
    save: vi.fn(),
  };

  const resolutionRepository = {
    create: vi.fn(),
    save: vi.fn(),
  };

  const alertsGateway = {
    emitNewAlert: vi.fn(),
  };

  const createAlert = (overrides: Partial<Alert> = {}): Alert =>
    Object.assign(new Alert(), {
      id: 'alert-id',
      category: 'Salud',
      description: 'Persona accidentada',
      status: 'PENDING',
      address: 'Dirección de prueba',
      imageUrl: undefined,
      images: [],
      location: {
        type: 'Point' as const,
        coordinates: [-65.3392, -26.9215] as [number, number],
      },
      userId: 'user-id',
      isArchived: false,
      ...overrides,
    });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: alertRepository,
        },
        {
          provide: getRepositoryToken(AlertHistory),
          useValue: historyRepository,
        },
        {
          provide: getRepositoryToken(AlertResolution),
          useValue: resolutionRepository,
        },
        {
          provide: AlertsGateway,
          useValue: alertsGateway,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('create', () => {
    it('crea un reporte sin imágenes con un arreglo vacío', async () => {
      const savedAlert = createAlert();
      const historyEntry = new AlertHistory();

      alertRepository.create.mockReturnValue(savedAlert);
      alertRepository.save.mockResolvedValue(savedAlert);
      historyRepository.create.mockReturnValue(historyEntry);
      historyRepository.save.mockResolvedValue(historyEntry);

      const result = await service.create({
        category: 'Salud',
        description: 'Persona accidentada',
        latitude: -26.9215,
        longitude: -65.3392,
        userId: 'user-id',
        images: [],
      });

      expect(alertRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Salud',
          description: 'Persona accidentada',
          userId: 'user-id',
          images: [],
          location: {
            type: 'Point',
            coordinates: [-65.3392, -26.9215],
          },
        }),
      );
      expect(historyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alert: savedAlert,
          newStatus: 'PENDING',
        }),
      );
      expect(alertsGateway.emitNewAlert).toHaveBeenCalledWith(savedAlert);
      expect(result).toBe(savedAlert);
    });

    it('conserva todas las imágenes de un reporte', async () => {
      const images = [
        '/uploads/alerts/alert-1.jpg',
        '/uploads/alerts/alert-2.jpg',
      ];
      const savedAlert = createAlert({ images });
      const historyEntry = new AlertHistory();

      alertRepository.create.mockReturnValue(savedAlert);
      alertRepository.save.mockResolvedValue(savedAlert);
      historyRepository.create.mockReturnValue(historyEntry);
      historyRepository.save.mockResolvedValue(historyEntry);

      await service.create({
        category: 'Seguridad',
        description: 'Persona sospechosa',
        latitude: -26.9215,
        longitude: -65.3392,
        userId: 'user-id',
        images,
      });

      expect(alertRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images,
        }),
      );
    });

    it('crea images usando imageUrl cuando no recibe un arreglo', async () => {
      const imageUrl = '/uploads/alerts/alert-legacy.jpg';
      const savedAlert = createAlert({
        imageUrl,
        images: [imageUrl],
      });
      const historyEntry = new AlertHistory();

      alertRepository.create.mockReturnValue(savedAlert);
      alertRepository.save.mockResolvedValue(savedAlert);
      historyRepository.create.mockReturnValue(historyEntry);
      historyRepository.save.mockResolvedValue(historyEntry);

      await service.create({
        category: 'Salud',
        description: 'Persona descompuesta',
        latitude: -26.9215,
        longitude: -65.3392,
        userId: 'user-id',
        imageUrl,
      });

      expect(alertRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl,
          images: [imageUrl],
        }),
      );
    });
  });

  describe('updateImageAtIndex', () => {
    it('reemplaza únicamente la imagen solicitada', async () => {
      const alert = createAlert({
        images: [
          '/uploads/alerts/alert-1.jpg',
          '/uploads/alerts/alert-2.jpg',
          '/uploads/alerts/alert-3.jpg',
        ],
        imageUrl: '/uploads/alerts/alert-1.jpg',
      });

      alertRepository.findOne.mockResolvedValue(alert);
      alertRepository.save.mockResolvedValue(alert);

      const result = await service.updateImageAtIndex(
        'alert-id',
        1,
        '/uploads/alerts/alert-new.jpg',
      );

      expect(alert.images).toEqual([
        '/uploads/alerts/alert-1.jpg',
        '/uploads/alerts/alert-new.jpg',
        '/uploads/alerts/alert-3.jpg',
      ]);
      expect(alert.imageUrl).toBe('/uploads/alerts/alert-1.jpg');
      expect(alertRepository.save).toHaveBeenCalledWith(alert);
      expect(result).toBe(alert);
    });

    it('actualiza imageUrl cuando reemplaza la primera imagen', async () => {
      const alert = createAlert({
        imageUrl: '/uploads/alerts/alert-old.jpg',
        images: ['/uploads/alerts/alert-old.jpg', '/uploads/alerts/alert-2.jpg'],
      });

      alertRepository.findOne.mockResolvedValue(alert);
      alertRepository.save.mockResolvedValue(alert);

      await service.updateImageAtIndex(
        'alert-id',
        0,
        '/uploads/alerts/alert-new.jpg',
      );

      expect(alert.imageUrl).toBe('/uploads/alerts/alert-new.jpg');
      expect(alert.images).toEqual([
        '/uploads/alerts/alert-new.jpg',
        '/uploads/alerts/alert-2.jpg',
      ]);
    });

    it('rechaza un índice negativo', async () => {
      const alert = createAlert({
        images: ['/uploads/alerts/alert-1.jpg'],
      });

      alertRepository.findOne.mockResolvedValue(alert);

      await expect(
        service.updateImageAtIndex(
          'alert-id',
          -1,
          '/uploads/alerts/alert-new.jpg',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un índice fuera del arreglo de imágenes', async () => {
      const alert = createAlert({
        images: ['/uploads/alerts/alert-1.jpg'],
      });

      alertRepository.findOne.mockResolvedValue(alert);

      await expect(
        service.updateImageAtIndex(
          'alert-id',
          1,
          '/uploads/alerts/alert-new.jpg',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza reemplazar imágenes de un reporte cerrado', async () => {
      const alert = createAlert({
        status: 'RESOLVED',
        images: ['/uploads/alerts/alert-1.jpg'],
      });

      alertRepository.findOne.mockResolvedValue(alert);

      await expect(
        service.updateImageAtIndex(
          'alert-id',
          0,
          '/uploads/alerts/alert-new.jpg',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un reporte inexistente', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateImageAtIndex(
          'missing-alert-id',
          0,
          '/uploads/alerts/alert-new.jpg',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByUserId', () => {
    it('filtra por usuario, archivado y aplica paginación', async () => {
      const alerts = [createAlert()];
      alertRepository.findAndCount.mockResolvedValue([alerts, 55]);

      const result = await service.findByUserId(
        'user-id',
        2,
        25,
        'true',
      );

      expect(alertRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
          isArchived: true,
        },
        relations: {
          history: true,
          resolution: true,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 25,
        skip: 25,
      });

      expect(result).toEqual({
        data: alerts,
        total: 55,
        currentPage: 2,
        lastPage: 3,
      });
    });
  });

  describe('updateDescription', () => {
    it('actualiza la descripción de un reporte pendiente', async () => {
      const alert = createAlert();
      alertRepository.findOne.mockResolvedValue(alert);
      alertRepository.save.mockResolvedValue(alert);

      const result = await service.updateDescription(
        'alert-id',
        'Descripción actualizada',
      );

      expect(alert.description).toBe('Descripción actualizada');
      expect(alertRepository.save).toHaveBeenCalledWith(alert);
      expect(result).toBe(alert);
    });

    it('rechaza editar un reporte cerrado', async () => {
      const alert = createAlert({ status: 'RESOLVED' });
      alertRepository.findOne.mockResolvedValue(alert);

      await expect(
        service.updateDescription('alert-id', 'Nueva descripción'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza editar un reporte inexistente', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDescription('missing-alert-id', 'Nueva descripción'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('elimina un reporte pendiente', async () => {
      const alert = createAlert();
      alertRepository.findOne.mockResolvedValue(alert);
      alertRepository.remove.mockResolvedValue(alert);

      const result = await service.remove('alert-id');

      expect(alertRepository.remove).toHaveBeenCalledWith(alert);
      expect(result).toEqual({
        message: 'Alerta cancelada y eliminada correctamente',
      });
    });

    it('rechaza eliminar un reporte que ya no está pendiente', async () => {
      const alert = createAlert({ status: 'IN_PROGRESS' });
      alertRepository.findOne.mockResolvedValue(alert);

      await expect(service.remove('alert-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(alertRepository.remove).not.toHaveBeenCalled();
    });

    it('rechaza eliminar un reporte inexistente', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('missing-alert-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('archiveAlert', () => {
    it('archiva un reporte resuelto', async () => {
      const alert = createAlert({
        status: 'RESOLVED',
        isArchived: false,
      });
      alertRepository.findOne.mockResolvedValue(alert);
      alertRepository.save.mockResolvedValue(alert);

      const result = await service.archiveAlert('alert-id');

      expect(alert.isArchived).toBe(true);
      expect(alertRepository.save).toHaveBeenCalledWith(alert);
      expect(result).toEqual({
        message: 'Reporte archivado correctamente',
      });
    });

    it('rechaza archivar un reporte pendiente', async () => {
      const alert = createAlert({
        status: 'PENDING',
        isArchived: false,
      });
      alertRepository.findOne.mockResolvedValue(alert);

      await expect(
        service.archiveAlert('alert-id'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza archivar un reporte inexistente', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await expect(
        service.archiveAlert('missing-alert-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resolveAlert', () => {
    it('crea una resolución con múltiples imágenes y actualiza el estado', async () => {
      const alert = createAlert();
      const resolution = new AlertResolution();
      const historyEntry = new AlertHistory();
      const imageUrls = [
        '/uploads/alerts/resolution-1.jpg',
        '/uploads/alerts/resolution-2.jpg',
      ];

      alertRepository.findOne.mockResolvedValue(alert);
      resolutionRepository.create.mockReturnValue(resolution);
      resolutionRepository.save.mockResolvedValue(resolution);
      historyRepository.create.mockReturnValue(historyEntry);
      historyRepository.save.mockResolvedValue(historyEntry);
      alertRepository.save.mockResolvedValue(alert);

      const result = await service.resolveAlert(
        'alert-id',
        'Trabajo finalizado',
        imageUrls,
        'RESOLVED',
      );

      expect(resolutionRepository.create).toHaveBeenCalledWith({
        alert,
        description: 'Trabajo finalizado',
        imageUrl: imageUrls[0],
        images: imageUrls,
      });
      expect(resolutionRepository.save).toHaveBeenCalledWith(resolution);
      expect(historyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alert,
          previousStatus: 'PENDING',
          newStatus: 'RESOLVED',
        }),
      );
      expect(alert.status).toBe('RESOLVED');
      expect(alertRepository.save).toHaveBeenCalledWith(alert);
      expect(result).toBe(alert);
    });

    it('rechaza resolver un reporte que ya está cerrado', async () => {
      const alert = createAlert({ status: 'DISMISSED' });
      alertRepository.findOne.mockResolvedValue(alert);

      await expect(
        service.resolveAlert(
          'alert-id',
          'Informe duplicado',
          [],
          'RESOLVED',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(resolutionRepository.create).not.toHaveBeenCalled();
      expect(alertRepository.save).not.toHaveBeenCalled();
    });
  });
});