import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * La estrategia JWT de Passport se ejecuta automáticamente en cada endpoint
 * protegido con el guard JwtAuthGuard.
 *
 * Lo que hace:
 * 1. Extrae el token del header Authorization: Bearer <token>
 * 2. Lo verifica con el secreto JWT
 * 3. Si es válido, llama a validate() con el payload decodificado
 * 4. El objeto retornado por validate() queda disponible en request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => {
                    return req?.query?.token as string;
                },
            ]),
            ignoreExpiration: false, // rechaza tokens expirados
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(payload: { sub: string; email: string }) {
        const user = await this.usersService.findById(payload.sub);

        if (!user) {
            throw new UnauthorizedException('Token inválido');
        }

        // Este objeto queda en req.user para todos los handlers del endpoint
        return { id: user.id, email: user.email, name: user.name };
    }
}