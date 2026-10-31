import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticesService } from './notices.service.js';
import { NoticesController } from './notices.controller.js';
import { Notice } from './entities/notice.entity.js';
import { NoticeRead } from './entities/notice-read.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notice, NoticeRead])],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}