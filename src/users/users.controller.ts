import { 
  Controller, Post, Body, Patch, Param, ParseUUIDPipe, 
  UseInterceptors, UploadedFile, BadRequestException, Get, UseGuards, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto.js';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.usersService.login(loginUserDto);
  }

  @Post('password-recovery/request')
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return await this.usersService.requestPasswordReset(
      requestPasswordResetDto,
    );
  }

  @Post('password-recovery/confirm')
  async confirmPasswordReset(
    @Body() confirmPasswordResetDto: ConfirmPasswordResetDto,
  ) {
    return await this.usersService.confirmPasswordReset(
      confirmPasswordResetDto,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() request: AuthenticatedRequest) {
    return await this.usersService.findPublicById(request.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    // ESTE ES NUESTRO RASTREADOR EN EL BACKEND
    console.log('👉 BACKEND RECIBIÓ ESTOS DATOS:', updateUserDto);
    return await this.usersService.update(id, updateUserDto);
  }

  // --- NUEVO ENDPOINT AGREGADO: Subida de Fotografía ---
  @Patch(':id/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './uploads/avatars';
        // Crea la carpeta automáticamente si no existe en la raíz del backend
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // Genera un nombre de archivo seguro: ID_USUARIO-TIMESTAMP.extensión
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${req.params.id}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      // Bloquea cualquier archivo que no sea una imagen
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen (jpg, png, webp)'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // Bloquea archivos mayores a 5 MB
  }))
  async uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ninguna imagen');
    }
    
    // Genera la ruta relativa que se leerá desde el celular
    const fileUrl = `/uploads/avatars/${file.filename}`;
    return await this.usersService.updateAvatar(id, fileUrl);
  }
}