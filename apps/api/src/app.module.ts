import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { appConfig, databaseConfig, jwtConfig } from './app.config';

@Module({
    imports: [
        /**
         * ConfigModule: carga el archivo .env y lo hace disponible
         * en toda la app mediante inyección de dependencias (ConfigService).
         * isGlobal: true evita importarlo en cada módulo.
         * load: permite agrupar la config en namespaces tipados.
         */
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '../../.env',
            load: [appConfig, databaseConfig, jwtConfig],
        }),

        /**
         * ThrottlerModule: Protege contra ataques de fuerza bruta y DDoS limitando
         * la cantidad de peticiones por IP.
         */
        ThrottlerModule.forRoot([{
            ttl: 60000, // 60 segundos
            limit: 100, // 100 peticiones máximo
        }]),

        /**
         * TypeOrmModule: conecta con PostgreSQL usando la config del .env.
         * autoLoadEntities: registra automáticamente las entidades que otros
         * módulos declaren con TypeOrmModule.forFeature([...]).
         * synchronize SOLO en desarrollo — en producción se usan migraciones.
         */
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get('database.host'),
                port: config.get('database.port'),
                username: config.get('database.user'),
                password: config.get('database.password'),
                database: config.get('database.name'),
                autoLoadEntities: true,
                synchronize: ['development', 'test'].includes(config.get('app.nodeEnv') || ''),
                logging: config.get('app.nodeEnv') === 'development',
            }),
        }),

        AuthModule,
        UsersModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }