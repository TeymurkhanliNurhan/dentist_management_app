import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  
  // Enable CORS
  app.enableCors({
    origin: true, // Allow all origins (for development)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Give TypeORM time to connect and synchronize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const config = new DocumentBuilder()
    .setTitle('Dentist Management API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
        name: 'Authorization',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Swagger at /docs (root level, separate from /api routes)
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\n✅ Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs\n`);
  console.log(`🔗 API Endpoints: http://localhost:${port}/api\n`);
}
bootstrap();
