import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './swagger.config';
import { validateEnvironment } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

  app.setGlobalPrefix('api');

  app.use(
    helmet({
      contentSecurityPolicy: isProd,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const allowedOrigins = (process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://localhost:3001'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Pas d'Origin = appels serveur-à-serveur (routes API Next.js, health checks, curl)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  if (!isProd) {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 3000);
  const url = await app.getUrl();
  console.log('API running on ' + url);
  if (!isProd) {
    console.log('Swagger on ' + url.replace(/\/$/, '') + '/api/docs');
  }
}
bootstrap();
