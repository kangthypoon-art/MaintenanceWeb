import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,           // 요청 Origin을 그대로 반사 (개발용)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Swagger API 문서
  const config = new DocumentBuilder()
    .setTitle('유지보수 예방점검 API')
    .setDescription('예방점검 일정 관리 시스템 REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  // '0.0.0.0' 으로 바인딩해야 Android 에뮬레이터(10.0.2.2)에서 접근 가능
  await app.listen(port, '0.0.0.0');
  console.log(`서버 실행 중: http://localhost:${port}/api`);
  console.log(`Swagger 문서: http://localhost:${port}/api/docs`);
}

bootstrap();
