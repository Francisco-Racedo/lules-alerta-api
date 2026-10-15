import { 
  Controller, Post, Body, Get, Query, BadRequestException, 
  Patch, Param, UseInterceptors, UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AlertsService } from './alerts.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto.js';
import { ApiQuery } from '@nestjs/swagger';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './uploads/alerts';
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `alert-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 8 * 1024 * 1024 },
  }))
  async create(
    @Body() body: any, 
    @UploadedFile() file?: Express.Multer.File
  ) {
    // CORRECCIÓN TYPESCRIPT: Usamos 'undefined' en lugar de 'null'
    const finalImageUrl = file ? `/uploads/alerts/${file.filename}` : undefined;
    
    const createAlertDto: CreateAlertDto = {
      category: body.category,
      description: body.description,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      userId: body.userId,
      address: body.address === 'null' ? undefined : body.address,
      imageUrl: finalImageUrl,
    };

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
      throw new BadRequestException('Las coordenadas son obligatorias');
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

  @Get('all')
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Cantidad de registros (por defecto: 10)' })
  async getAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, parseInt(limit, 10));
    return await this.alertsService.findAllPaginated(pageNumber, limitNumber);
  }
}