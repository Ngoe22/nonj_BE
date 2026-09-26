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


// PHẢI gọi TRƯỚC NestFactory.create():
// typeorm-transactional patch DataSource ngay lúc nó được khởi tạo, nếu gọi sau
// thì @Transactional() sẽ KHÔNG rollback (bug: write vẫn persist dù request fail).
initializeTransactionalContext();

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  // database
  const dataSource = app.get(DataSource);

  // data validate
  addTransactionalDataSource(dataSource);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // exceptionFactory :(errors: ValidationError[]) =>{
      //   const formatedErrors = errors.map((error) => formatDtoException(error));
      //   return new BadRequestException({
      //     statusCode: 400,
      //     errorCode: 'invalid_input',
      //     detail: formatedErrors,
      //   });
      // },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // cookie
  app.use(cookieParser());
  app.enableCors({
      origin: process.env.FE_URL,
      credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();














