import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';

import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';

describe('AlertsController', () => {
  let controller: AlertsController;

  const alertsService = {
    create: vi.fn(),
    findAllPaginated: vi.fn(),
    findByUserId: vi.fn(),
    getNearbyAlerts: vi.fn(),
    updateDescription: vi.fn(),
    remove: vi.fn(),
    updateStatus: vi.fn(),
    updateImageAtIndex: vi.fn(),
    updateImage: vi.fn(),
    archiveAlert: vi.fn(),
    resolveAlert: vi.fn(),
  };

  const createFile = (filename: string): Express.Multer.File =>
    ({ filename }) as Express.Multer.File;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: alertsService,
        },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('crea un reporte con múltiples imágenes', async () => {
      const expectedAlert = {
        id: 'alert-id',
        status: 'PENDING',
      };

      const files = [
        createFile('alert-1.jpg'),
        createFile('alert-2.jpg'),
        createFile('alert-3.jpg'),
      ];

      alertsService.create.mockResolvedValue(expectedAlert);

      const result = await controller.create(
        {
          category: 'Seguridad',
          description: 'Persona sospechosa',
          latitude: '-26.9215',
          longitude: '-65.3392',
          userId: 'user-id',
          address: 'Dirección de prueba',
        },
        files,
      );

      expect(alertsService.create).toHaveBeenCalledWith({
        category: 'Seguridad',
        description: 'Persona sospechosa',
        latitude: -26.9215,
        longitude: -65.3392,
        userId: 'user-id',
        address: 'Dirección de prueba',
        imageUrl: '/uploads/alerts/alert-1.jpg',
        images: [
          '/uploads/alerts/alert-1.jpg',
          '/uploads/alerts/alert-2.jpg',
          '/uploads/alerts/alert-3.jpg',
        ],
      });

      expect(result).toBe(expectedAlert);
    });

    it('crea un reporte sin imágenes y convierte address null en undefined', async () => {
      const expectedAlert = {
        id: 'alert-id',
        status: 'PENDING',
      };

      alertsService.create.mockResolvedValue(expectedAlert);

      await controller.create({
        category: 'Salud',
        description: 'Persona accidentada',
        latitude: '-26.9215',
        longitude: '-65.3392',
        userId: 'user-id',
        address: 'null',
      });

      expect(alertsService.create).toHaveBeenCalledWith({
        category: 'Salud',
        description: 'Persona accidentada',
        latitude: -26.9215,
        longitude: -65.3392,
        userId: 'user-id',
        address: undefined,
        imageUrl: undefined,
        images: [],
      });
    });
  });

  describe('getAll', () => {
    it('convierte page y limit y delega en el servicio', async () => {
      const expectedResponse = {
        data: [],
        total: 0,
        currentPage: 2,
        lastPage: 0,
      };

      alertsService.findAllPaginated.mockResolvedValue(expectedResponse);

      const result = await controller.getAll('2', '25');

      expect(alertsService.findAllPaginated).toHaveBeenCalledWith(2, 25);
      expect(result).toBe(expectedResponse);
    });

    it('aplica valores mínimos de uno para page y limit', async () => {
      alertsService.findAllPaginated.mockResolvedValue({
        data: [],
        total: 0,
        currentPage: 1,
        lastPage: 0,
      });

      await controller.getAll('0', '0');

      expect(alertsService.findAllPaginated).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getUserAlerts', () => {
    it('delega userId, paginación y archived en el servicio', async () => {
      const expectedResponse = {
        data: [],
        total: 0,
        currentPage: 3,
        lastPage: 3,
      };

      alertsService.findByUserId.mockResolvedValue(expectedResponse);

      const result = await controller.getUserAlerts(
        'user-id',
        '3',
        '20',
        'true',
      );

      expect(alertsService.findByUserId).toHaveBeenCalledWith(
        'user-id',
        3,
        20,
        'true',
      );
      expect(result).toBe(expectedResponse);
    });
  });

  describe('getNearby', () => {
    it('convierte coordenadas y usa el radio recibido', async () => {
      const expectedAlerts = [{ id: 'alert-id' }];

      alertsService.getNearbyAlerts.mockResolvedValue(expectedAlerts);

      const result = await controller.getNearby(
        '-26.9215',
        '-65.3392',
        '1500',
      );

      expect(alertsService.getNearbyAlerts).toHaveBeenCalledWith(
        -26.9215,
        -65.3392,
        1500,
      );
      expect(result).toBe(expectedAlerts);
    });

    it('usa 3000 metros cuando no se recibe radio', async () => {
      alertsService.getNearbyAlerts.mockResolvedValue([]);

      await controller.getNearby('-26.9215', '-65.3392', '');

      expect(alertsService.getNearbyAlerts).toHaveBeenCalledWith(
        -26.9215,
        -65.3392,
        3000,
      );
    });

    it('rechaza coordenadas inválidas', async () => {
      await expect(
        controller.getNearby('latitud-inválida', '-65.3392', '1500'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertsService.getNearbyAlerts).not.toHaveBeenCalled();
    });
  });

  describe('updateDescription', () => {
    it('actualiza la descripción mediante el servicio', async () => {
      const expectedAlert = {
        id: 'alert-id',
        description: 'Descripción actualizada',
      };

      alertsService.updateDescription.mockResolvedValue(expectedAlert);

      const result = await controller.updateDescription(
        'alert-id',
        'Descripción actualizada',
      );

      expect(alertsService.updateDescription).toHaveBeenCalledWith(
        'alert-id',
        'Descripción actualizada',
      );
      expect(result).toBe(expectedAlert);
    });

    it('rechaza una descripción vacía', async () => {
      await expect(
        controller.updateDescription('alert-id', ''),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertsService.updateDescription).not.toHaveBeenCalled();
    });
  });

  describe('deleteAlert', () => {
    it('delega la eliminación en el servicio', async () => {
      const expectedResponse = {
        message: 'Alerta cancelada y eliminada correctamente',
      };

      alertsService.remove.mockResolvedValue(expectedResponse);

      const result = await controller.deleteAlert('alert-id');

      expect(alertsService.remove).toHaveBeenCalledWith('alert-id');
      expect(result).toBe(expectedResponse);
    });
  });

  describe('updateStatus', () => {
    it('delega estado y comentario en el servicio', async () => {
      const expectedAlert = {
        id: 'alert-id',
        status: 'IN_PROGRESS',
      };

      alertsService.updateStatus.mockResolvedValue(expectedAlert);

      const result = await controller.updateStatus('alert-id', {
        status: 'IN_PROGRESS',
        comment: 'Cuadrilla en camino',
      });

      expect(alertsService.updateStatus).toHaveBeenCalledWith(
        'alert-id',
        'IN_PROGRESS',
        'Cuadrilla en camino',
      );
      expect(result).toBe(expectedAlert);
    });

    it('permite actualizar el estado sin comentario', async () => {
      alertsService.updateStatus.mockResolvedValue({
        id: 'alert-id',
        status: 'IN_PROGRESS',
      });

      await controller.updateStatus('alert-id', {
        status: 'IN_PROGRESS',
      });

      expect(alertsService.updateStatus).toHaveBeenCalledWith(
        'alert-id',
        'IN_PROGRESS',
        undefined,
      );
    });
  });

  describe('updateImageAtIndex', () => {
    it('reemplaza una imagen por índice', async () => {
      const file = createFile('replacement.jpg');
      const expectedAlert = {
        id: 'alert-id',
        images: [
          '/uploads/alerts/replacement.jpg',
          '/uploads/alerts/alert-2.jpg',
        ],
      };

      alertsService.updateImageAtIndex.mockResolvedValue(expectedAlert);

      const result = await controller.updateImageAtIndex(
        'alert-id',
        0,
        file,
      );

      expect(alertsService.updateImageAtIndex).toHaveBeenCalledWith(
        'alert-id',
        0,
        '/uploads/alerts/replacement.jpg',
      );
      expect(result).toBe(expectedAlert);
    });

    it('rechaza una imagen faltante', async () => {
      await expect(
        controller.updateImageAtIndex(
          'alert-id',
          0,
          undefined as unknown as Express.Multer.File,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertsService.updateImageAtIndex).not.toHaveBeenCalled();
    });

    it('rechaza índices superiores al máximo permitido', async () => {
      const file = createFile('replacement.jpg');

      await expect(
        controller.updateImageAtIndex('alert-id', 5, file),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertsService.updateImageAtIndex).not.toHaveBeenCalled();
    });
  });

  describe('updateImage', () => {
    it('mantiene compatibilidad con el endpoint antiguo', async () => {
      const file = createFile('legacy.jpg');
      const expectedAlert = {
        id: 'alert-id',
        imageUrl: '/uploads/alerts/legacy.jpg',
      };

      alertsService.updateImage.mockResolvedValue(expectedAlert);

      const result = await controller.updateImage('alert-id', file);

      expect(alertsService.updateImage).toHaveBeenCalledWith(
        'alert-id',
        '/uploads/alerts/legacy.jpg',
      );
      expect(result).toBe(expectedAlert);
    });

    it('rechaza una imagen faltante', async () => {
      await expect(
        controller.updateImage(
          'alert-id',
          undefined as unknown as Express.Multer.File,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertsService.updateImage).not.toHaveBeenCalled();
    });
  });

  describe('archiveAlert', () => {
    it('delega el archivado en el servicio', async () => {
      const expectedResponse = {
        message: 'Reporte archivado correctamente',
      };

      alertsService.archiveAlert.mockResolvedValue(expectedResponse);

      const result = await controller.archiveAlert('alert-id');

      expect(alertsService.archiveAlert).toHaveBeenCalledWith('alert-id');
      expect(result).toBe(expectedResponse);
    });
  });

  describe('createResolution', () => {
    it('crea una resolución con múltiples imágenes', async () => {
      const files = [
        createFile('resolution-1.jpg'),
        createFile('resolution-2.jpg'),
      ];
      const expectedAlert = {
        id: 'alert-id',
        status: 'RESOLVED',
      };

      alertsService.resolveAlert.mockResolvedValue(expectedAlert);

      const result = await controller.createResolution(
        'alert-id',
        {
          description: 'Trabajo finalizado',
          status: 'RESOLVED',
        },
        files,
      );

      expect(alertsService.resolveAlert).toHaveBeenCalledWith(
        'alert-id',
        'Trabajo finalizado',
        [
          '/uploads/alerts/resolution-1.jpg',
          '/uploads/alerts/resolution-2.jpg',
        ],
        'RESOLVED',
      );
      expect(result).toBe(expectedAlert);
    });

    it('convierte cualquier estado distinto de DISMISSED en RESOLVED', async () => {
      alertsService.resolveAlert.mockResolvedValue({
        id: 'alert-id',
        status: 'RESOLVED',
      });

      await controller.createResolution(
        'alert-id',
        {
          description: 'Trabajo finalizado',
          status: 'IN_PROGRESS',
        },
        [],
      );

      expect(alertsService.resolveAlert).toHaveBeenCalledWith(
        'alert-id',
        'Trabajo finalizado',
        [],
        'RESOLVED',
      );
    });

    it('crea una resolución sin imágenes', async () => {
      alertsService.resolveAlert.mockResolvedValue({
        id: 'alert-id',
        status: 'RESOLVED',
      });

      await controller.createResolution(
        'alert-id',
        {
          description: 'Sin evidencia fotográfica',
        },
        undefined,
      );

      expect(alertsService.resolveAlert).toHaveBeenCalledWith(
        'alert-id',
        'Sin evidencia fotográfica',
        [],
        'RESOLVED',
      );
    });

    it('rechaza una descripción vacía', async () => {
      await expect(
        controller.createResolution(
          'alert-id',
          {
            description: '   ',
          },
          [],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(alertsService.resolveAlert).not.toHaveBeenCalled();
    });
  });
});