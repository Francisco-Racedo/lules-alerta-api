import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiQuery } from '@nestjs/swagger';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NoticesService } from './notices.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const UPLOAD_PATH = './uploads/notices';

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

const noticeImageStorage = diskStorage({
  destination: (req, file, callback) => {
    if (!existsSync(UPLOAD_PATH)) {
      mkdirSync(UPLOAD_PATH, { recursive: true });
    }

    callback(null, UPLOAD_PATH);
  },
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `notice-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  async create(@Body() createNoticeDto: CreateNoticeDto) {
    return await this.noticesService.create(createNoticeDto);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string) {
    return await this.noticesService.archive(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNoticeDto: UpdateNoticeDto,
  ) {
    return await this.noticesService.update(id, updateNoticeDto);
  }

  @Patch(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen JPG, JPEG, PNG o WEBP de hasta 8 MB.',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: noticeImageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async updateImage(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se adjuntó ninguna imagen.');
    }

    return await this.noticesService.updateImage(
      id,
      `/uploads/notices/${file.filename}`,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.noticesService.remove(id);
  }

  @Get('geocode')
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Calle, dirección o intersección para buscar en Lules',
    example: 'San Martín y 9 de Julio',
  })
  async geocode(@Query('q') query?: string) {
    if (!query?.trim()) {
      throw new BadRequestException('El parámetro q es obligatorio.');
    }

    return await this.noticesService.searchGeocoding(query);
  }

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async findAll(
    @Query('barrio') barrio?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    return await this.noticesService.findAll(barrio, sourceType);
  }
}