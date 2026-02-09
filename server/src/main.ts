import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:4200', 'http://localhost:4000'],
      credentials: true,
    },
  });

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  console.log(`🚀 Checkers server running on http://localhost:${port}`);
}

bootstrap();

