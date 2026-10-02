import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const newUser = this.userRepository.create(createUserDto);
      return await this.userRepository.save(newUser);
    } catch (error: any) {
      // El código '23505' en PostgreSQL indica una violación de restricción UNIQUE (dispositivo duplicado)
      if (error.code === '23505') {
        throw new ConflictException('Este dispositivo ya se encuentra registrado en el sistema.');
      }
      throw error;
    }
  }
}