import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import {HttpExceptionFilter} from "./_common/filters/http-exception.filter.js";
import {TransformInterceptor} from "./_common/interceptor/success.interceptor.js";
import {
  addTransactionalDataSource,
  initializeTransactionalContext,
} from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { formatDtoException } from './_common/filters/dto_exception_format.js';
import cookieParser from 'cookie-parser';





///


async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  // database
  initializeTransactionalContext();
  const dataSource = app.get(DataSource);

  // data validate
  addTransactionalDataSource(dataSource);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: false,
      transformOptions: {
        enableImplicitConversion: false,
      },
      exceptionFactory :(errors: ValidationError[]) =>{
        const formatedErrors = errors.map((error) => formatDtoException(error));
        return new BadRequestException({
          statusCode: 400,
          errorCode: 'invalid_input',
          detail: formatedErrors,
        });
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());


  // cookie
  app.use(cookieParser());
  app.enableCors({
      origin: process.env.FE_URL,   // domain thật của FE, KHÔNG dùng '*' khi bật credentials
      credentials: true,             // bắt buộc để cookie hoạt động qua CORS
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();














