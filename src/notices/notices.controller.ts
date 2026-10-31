import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NoticesService } from './notices.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  async create(@Body() createNoticeDto: CreateNoticeDto) {
    return await this.noticesService.create(createNoticeDto);
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