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
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NoticesService } from './notices.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';

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