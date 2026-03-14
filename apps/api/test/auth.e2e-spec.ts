import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
    let app: INestApplication<App>;
    
    // Generamos datos aleatorios para que la prueba sea repetible sin chocar en la DB
    const testUser = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
    };

    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // IMPORTANTE: Para tests E2E precisos, debes replicar la configuración de main.ts
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        app.useGlobalInterceptors(
            new ClassSerializerInterceptor(app.get(Reflector)),
        );

        await app.init();
    }, 30000); // Darle 30 segundos para levantar

    afterAll(async () => {
        if (app) await app.close();
    });

    describe('/api/v1/auth/register (POST)', () => {
        it('debe registrar un usuario exitosamente', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send(testUser)
                .expect(201)
                .expect((res) => {
                    expect(res.body.message).toEqual('Usuario registrado exitosamente');
                    expect(res.body.accessToken).toBeDefined();
                    expect(res.body.refreshToken).toBeDefined();
                    
                    // Aseguramos que el JSON no filtre data sensible accidentalmente
                    expect(res.body.password).toBeUndefined();
                });
        });

        it('debe rechazar un email duplicado (409 Conflict)', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send(testUser)
                .expect(409)
                .expect((res) => {
                    expect(res.body.message).toEqual('El email ya está registrado');
                });
        });
    });

    describe('/api/v1/auth/login (POST)', () => {
        it('debe iniciar sesión y devolver tokens sin la contraseña', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.message).toEqual('Sesión iniciada exitosamente');
                    expect(res.body.accessToken).toBeDefined();
                    expect(res.body.refreshToken).toBeDefined();
                    
                    // Guardamos los tokens para las siguientes pruebas
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                });
        });

        it('debe rechazar credenciales inválidas (401)', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword!',
                })
                .expect(401);
        });
    });

    describe('/api/v1/auth/refresh (POST)', () => {
        it('debe devolver nuevos tokens si se provee un refresh token válido', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Authorization', `Bearer ${refreshToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.accessToken).toBeDefined();
                    expect(res.body.refreshToken).toBeDefined();
                    
                    // Actualizamos para el logout test
                    refreshToken = res.body.refreshToken;
                });
        });

        it('no debe permitir el acceso sin Bearer token', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .expect(401);
        });
    });

    describe('/api/v1/auth/logout (POST)', () => {
        it('debe revocar la sesión exitosamente', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.message).toEqual('Sesión cerrada exitosamente');
                });
        });

        it('debe fallar si intentamos hacer refresh con el token viejo o revocado', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Authorization', `Bearer ${refreshToken}`)
                .expect(401); // Se espera que falle porque el token ya no está en BD
        });
    });

    describe('Rate Limiting', () => {
        it('debe devolver 429 Too Many Requests cuando se excede el límite', async () => {
            let wasRateLimited = false;
            
            // Hacemos peticiones secuenciales rápidas. Throttler debería bloquear la IP
            // antes de llegar a las 105 peticiones.
            for (let i = 0; i < 105; i++) {
                const res = await request(app.getHttpServer())
                    .post('/api/v1/auth/login')
                    .send({});
                
                if (res.status === 429) {
                    wasRateLimited = true;
                    break;
                }
            }

            expect(wasRateLimited).toBe(true);
        }, 15000); // Dar más timeout a este test
    });
});
