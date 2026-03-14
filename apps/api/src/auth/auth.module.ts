import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './guards/jwt.strategy';
import { JwtRefreshStrategy } from './guards/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        /**
         * JwtModule.register({}) sin secreto aquí — cada llamada a jwtService.sign()
         * pasa su propio secreto explícitamente desde auth.service.ts.
         * Esto permite usar secretos diferentes para access y refresh tokens.
         */
        JwtModule.register({}),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule { }