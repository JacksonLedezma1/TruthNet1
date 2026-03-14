import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/DTO/create-user.dto';
import { LoginDto } from './DTO/login.dto';
import { User } from '../users/users.entity';

interface JwtPayload {
    sub: string; // subject: el ID del usuario (estándar JWT)
    email: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(createUserDto: CreateUserDto): Promise<AuthTokens> {
        const user = await this.usersService.create(createUserDto);
        return this.generateTokens(user);
    }

    async login(loginDto: LoginDto): Promise<AuthTokens> {
        const user = await this.usersService.findByEmail(loginDto.email);

        /**
         * Usamos el mismo mensaje de error para email incorrecto y contraseña incorrecta.
         * Si diferenciamos los mensajes ("email no existe" vs "contraseña incorrecta")
         * le damos información a un atacante para enumerar usuarios.
         * Este patrón se llama "error message uniformity".
         */
        if (!user || !(await user.validatePassword(loginDto.password))) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        return this.generateTokens(user);
    }

    async refreshTokens(user: User): Promise<AuthTokens> {
        // user ya está validado por el JwtRefreshStrategy
        return this.generateTokens(user);
    }

    async logout(userId: string) {
        await this.usersService.removeRefreshToken(userId);
    }

    private async generateTokens(user: User): Promise<AuthTokens> {
        const payload: JwtPayload = { sub: user.id, email: user.email };

        /**
         * Access token: vida corta (7 días por defecto).
         * Se envía en cada request para verificar identidad.
         *
         * Refresh token: vida larga (30 días).
         * Solo se usa para obtener un nuevo access token cuando expira.
         * Firmado con un secreto diferente para que no sean intercambiables.
         */
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: this.configService.get('jwt.expiresIn'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        });

        await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

        return { accessToken, refreshToken };
    }
}