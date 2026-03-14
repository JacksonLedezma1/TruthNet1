import { registerAs } from '@nestjs/config';

/**
 * registerAs agrupa variables de entorno bajo un namespace.
 * Ventaja: en vez de config.get('DB_HOST') usas config.get('database.host')
 * lo que hace el código más legible y refactorizable.
 */

export const appConfig = registerAs('app', () => ({
    port: parseInt(process.env.API_PORT ?? '3001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));

export const databaseConfig = registerAs('database', () => ({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME ?? 'truthnet_db',
}));

export const jwtConfig = registerAs('jwt', () => ({
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
}));