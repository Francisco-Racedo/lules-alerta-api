import { Controller, Post, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

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

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    // ESTE ES NUESTRO RASTREADOR EN EL BACKEND
    console.log('👉 BACKEND RECIBIÓ ESTOS DATOS:', updateUserDto);
    return await this.usersService.update(id, updateUserDto);
  }
}