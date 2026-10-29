import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  BadRequestException,
  Patch,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseUUIDPipe,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AlertsService } from './alerts.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto.js';
import {
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const UPLOAD_PATH = './uploads/alerts';

const imageFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
    callback(
      new BadRequestException('Solo se permiten archivos de imagen'),
      false,
    );
    return;
  }

  callback(null, true);
};

const createImageStorage = (prefix: string) =>
  diskStorage({
    destination: (req, file, callback) => {
      if (!existsSync(UPLOAD_PATH)) {
        mkdirSync(UPLOAD_PATH, { recursive: true });
      }

      callback(null, UPLOAD_PATH);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix =
        Date.now() + '-' + Math.round(Math.random() * 1e9);

      callback(
        null,
        `${prefix}-${uniqueSuffix}${extname(file.originalname)}`,
      );
    },
  });

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES, {
      storage: createImageStorage('alert'),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async create(
    @Body() body: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const imagesUrls =
      files && files.length > 0
        ? files.map((file) => `/uploads/alerts/${file.filename}`)
        : [];

    const finalImageUrl =
      imagesUrls.length > 0 ? imagesUrls[0] : undefined;

    const createAlertDto: CreateAlertDto = {
      category: body.category,
      description: body.description,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      userId: body.userId,
      address: body.address === 'null' ? undefined : body.address,
      imageUrl: finalImageUrl,
      images: imagesUrls,
    };

    return await this.alertsService.create(createAlertDto);
  }

  @Get('all')
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (por defecto: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de registros (por defecto: 10)',
  })
  async getAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, parseInt(limit, 10));

    return await this.alertsService.findAllPaginated(
      pageNumber,
      limitNumber,
    );
  }

  @Get('user/:userId')
  async getUserAlerts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('archived') archived: string = 'false',
  ) {
    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, parseInt(limit, 10));

    return await this.alertsService.findByUserId(
      userId,
      pageNumber,
      limitNumber,
      archived,
    );
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

    return await this.alertsService.getNearbyAlerts(
      latitude,
      longitude,
      radiusInMeters,
    );
  }

  @Patch(':id/description')
  async updateDescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('description') description: string,
  ) {
    if (!description) {
      throw new BadRequestException(
        'La nueva descripción es requerida.',
      );
    }

    return await this.alertsService.updateDescription(id, description);
  }

  @Delete(':id')
  async deleteAlert(@Param('id', ParseUUIDPipe) id: string) {
    return await this.alertsService.remove(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateAlertStatusDto: UpdateAlertStatusDto,
  ) {
    return await this.alertsService.updateStatus(
      id,
      updateAlertStatusDto.status,
      updateAlertStatusDto.comment,
    );
  }

  @Patch(':id/images/:imageIndex')
@UseInterceptors(
  FileInterceptor('file', {
    storage: createImageStorage('alert'),
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_IMAGE_SIZE },
  }),
)
async updateImageAtIndex(
  @Param('id', ParseUUIDPipe) id: string,
  @Param('imageIndex', ParseIntPipe) imageIndex: number,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException(
      'No se adjuntó ninguna imagen nueva.',
    );
  }

  if (imageIndex < 0 || imageIndex >= MAX_IMAGES) {
    throw new BadRequestException(
      `El índice de imagen debe estar entre 0 y ${MAX_IMAGES - 1}.`,
    );
  }

  const imageUrl = `/uploads/alerts/${file.filename}`;

  return await this.alertsService.updateImageAtIndex(
    id,
    imageIndex,
    imageUrl,
  );
}

  @Patch(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createImageStorage('alert'),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se adjuntó ninguna imagen nueva.',
      );
    }

    const imageUrl = `/uploads/alerts/${file.filename}`;

    return await this.alertsService.updateImage(id, imageUrl);
  }

  @Patch(':id/archive')
  async archiveAlert(@Param('id', ParseUUIDPipe) id: string) {
    return await this.alertsService.archiveAlert(id);
  }

  @Post(':id/resolution')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description:
            'Informe oficial de la cuadrilla detallando el trabajo realizado o motivo de rechazo.',
        },
        status: {
          type: 'string',
          enum: ['RESOLVED', 'DISMISSED'],
          default: 'RESOLVED',
          description:
            'Estado final del reporte.',
        },
        files: {
          type: 'array',
          maxItems: MAX_IMAGES,
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Hasta cinco fotografías del trabajo terminado o motivo.',
        },
      },
      required: ['description'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES, {
      storage: createImageStorage('resolution'),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async createResolution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    if (!body.description || body.description.trim() === '') {
      throw new BadRequestException(
        'La descripción del trabajo realizado es obligatoria.',
      );
    }

    const imageUrls =
      files && files.length > 0
        ? files.map((file) => `/uploads/alerts/${file.filename}`)
        : [];

    const status =
      body.status === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED';

    return await this.alertsService.resolveAlert(
      id,
      body.description,
      imageUrls,
      status,
    );
  }
}