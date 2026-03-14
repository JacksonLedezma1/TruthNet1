import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/DTO/create-user.dto';
import { LoginDto } from './DTO/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh-auth.guard';
import { User } from '../users/users.entity';

/**
 * El controller solo se encarga de recibir requests y delegar al service.
 * No contiene lógica de negocio — eso va en AuthService.
 * Esta separación se llama "thin controller, fat service".
 */
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // POST /api/v1/auth/register
    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        const tokens = await this.authService.register(createUserDto);
        return {
            message: 'Usuario registrado exitosamente',
            ...tokens,
        };
    }

    // POST /api/v1/auth/login
    @Post('login')
    @HttpCode(HttpStatus.OK) // Por defecto POST devuelve 201, login debe ser 200
    async login(@Body() loginDto: LoginDto) {
        const tokens = await this.authService.login(loginDto);
        return {
            message: 'Sesión iniciada exitosamente',
            ...tokens,
        };
    }

    // POST /api/v1/auth/refresh — requiere Refresh Token válido
    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    async refresh(@Request() req: { user: User }) {
        const tokens = await this.authService.refreshTokens(req.user);
        return {
            message: 'Token renovado exitosamente',
            ...tokens,
        };
    }

    // POST /api/v1/auth/logout — requiere Access Token válido
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req: { user: { id: string } }) {
        await this.authService.logout(req.user.id);
        return {
            message: 'Sesión cerrada exitosamente',
        };
    }
}