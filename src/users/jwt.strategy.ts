import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { AuthenticatedUser } from './auth.types.js';

interface JwtPayload {
  sub?: unknown;
  dni?: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (typeof payload.sub !== 'string' || typeof payload.dni !== 'string') {
      throw new UnauthorizedException('El token de sesión no es válido.');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: {
        id: true,
        dni: true,
        role: true,
      },
    });

    if (!user || user.dni !== payload.dni) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    return {
      id: user.id,
      dni: user.dni,
      role: user.role,
    };
  }
}
