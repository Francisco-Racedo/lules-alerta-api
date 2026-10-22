import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
  async findAll(
    @Query('barrio') barrio?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    return await this.noticesService.findAll(barrio, sourceType);
  }
}