import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
            passReqToCallback: true, // Necesitamos el request para extraer el token en validate
        });
    }

    async validate(request: Request, payload: { sub: string; email: string }) {
        const refreshToken = request
            .get('Authorization')
            ?.replace('Bearer', '')
            .trim();

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token malformado');
        }

        const user = await this.usersService.getUserIfRefreshTokenMatches(
            refreshToken,
            payload.sub,
        );

        if (!user) {
            throw new UnauthorizedException('Token inválido o revocado');
        }

        return user;
    }
}
