import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getAllowedOrigins } from './cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  );

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`🚀 Checkers server running on http://localhost:${port}`);
}

bootstrap();

