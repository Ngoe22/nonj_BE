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
import { formatDtoException } from './_common/dto_exception_format/handler.js';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  initializeTransactionalContext();
  const dataSource = app.get(DataSource);
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

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();














