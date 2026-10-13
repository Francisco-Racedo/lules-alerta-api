import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  // Nuevo endpoint para el inicio de sesión
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.usersService.login(loginUserDto);
  }
}