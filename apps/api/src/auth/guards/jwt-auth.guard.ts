import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que protege endpoints: si el JWT no es válido o no existe,
 * NestJS responde automáticamente con HTTP 401 antes de llegar al handler.
 *
 * Uso en un controller:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@Request() req) { return req.user; }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }