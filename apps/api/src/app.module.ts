import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AnalysisModule } from './analysis/analysis.module';
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

        /**
         * BullModule.forRootAsync: configura la conexión a Redis una sola vez.
         * Todos los módulos que declaren BullModule.registerQueue({ name: '...' })
         * heredan esta conexión automáticamente.
         */
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                redis: {
                    host: config.get('REDIS_HOST', 'localhost'),
                    port: config.get<number>('REDIS_PORT', 6379),
                },
            }),
        }),
        /**
         * EventEmitterModule: bus de eventos interno de NestJS.
         * Permite comunicación desacoplada entre el Processor y el Controller
         * sin que se conozcan directamente entre sí.
         * wildcard: true → permite escuchar eventos con patrones como 'analysis.*'
         */
        EventEmitterModule.forRoot({ wildcard: true }),

        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

        AuthModule,
        UsersModule,
        AnalysisModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }