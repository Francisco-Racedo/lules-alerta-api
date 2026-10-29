import { Test, TestingModule } from '@nestjs/testing';

import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';

describe('AlertsController', () => {
  let controller: AlertsController;

  const alertsService = {};

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});