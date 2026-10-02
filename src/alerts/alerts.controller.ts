import { Controller, Post, Body, Get, Query, BadRequestException, Patch, Param } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto.js';
import { ApiQuery } from '@nestjs/swagger';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@Body() createAlertDto: CreateAlertDto) {
    return await this.alertsService.create(createAlertDto);
  }

  @Get()
  async getNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInMeters = radius ? parseInt(radius, 10) : 3000;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Las coordenadas (lat, lng) son obligatorias y deben ser números válidos.');
    }

    return await this.alertsService.getNearbyAlerts(latitude, longitude, radiusInMeters);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateAlertStatusDto: UpdateAlertStatusDto,
  ) {
    return await this.alertsService.updateStatus(id, updateAlertStatusDto.status);
  }

  // NUEVO MÉTODO: Endpoint GET para el panel de administración
  @Get('all')
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Cantidad de registros (por defecto: 10)' })
  async getAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    // Convertimos los parámetros de texto a números. Si no se envían, usan 1 y 10 por defecto.
    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, parseInt(limit, 10));
    
    return await this.alertsService.findAllPaginated(pageNumber, limitNumber);
  }
}