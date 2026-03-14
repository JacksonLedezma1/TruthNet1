import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  /**
   * Helmet añade cabeceras HTTP de seguridad automáticamente.
   * Protege contra ataques como clickjacking, XSS, sniffing de MIME, etc.
   * Es la primera línea de defensa a nivel HTTP.
   */
  app.use(helmet());

  /**
   * Prefijo global: todos los endpoints quedan bajo /api/v1/...
   * Buena práctica para versionar la API desde el día uno.
   */
  app.setGlobalPrefix('api/v1');

  /**
   * CORS: solo permite peticiones desde el frontend.
   * En producción esto debería ser la URL real de tu dominio.
   */
  app.enableCors({
    origin: config.get<string>('app.frontendUrl', 'http://localhost:3000'),
    credentials: true,
  });

  /**
   * ValidationPipe global: valida y transforma automáticamente
   * todos los DTOs de entrada en cada endpoint.
   * - whitelist: elimina propiedades que no están en el DTO (evita mass assignment)
   * - forbidNonWhitelisted: lanza error si llegan propiedades extra
   * - transform: convierte los tipos automáticamente (string "1" → number 1)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * Prefijo global: todos los endpoints quedan bajo /api/v1/...
   * Buena práctica para versionar la API desde el día uno.
   */
  /**
   * Serializador global: intercepta todas las respuestas JSON y elimina
   * las propiedades decoradas con @Exclude() en las entidades (como passwords)
   */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port);

  console.log(`\n🚀 API corriendo en: http://localhost:${port}/api/v1`);
}

bootstrap();