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
import {
  assertCorsConfigured,
  isOriginAllowed,
} from './_common/helper/cors.helper.js';





///


// PHẢI gọi TRƯỚC NestFactory.create():
// typeorm-transactional patch DataSource ngay lúc nó được khởi tạo, nếu gọi sau
// thì @Transactional() sẽ KHÔNG rollback (bug: write vẫn persist dù request fail).
initializeTransactionalContext();

/*
 * KHÔNG cần ép `process.env.TZ` ở đây.
 *
 * Mọi cột thời gian trong DB đều là `timestamptz` — Postgres lưu một mốc tuyệt
 * đối, driver đọc ra luôn đúng dù tiến trình chạy ở múi giờ nào, và trình duyệt
 * tự đổi sang giờ của người dùng. Nhờ vậy không có biến môi trường nào phải nhớ.
 *
 * (Trước đây cột là `timestamp` KHÔNG có múi giờ nên phải ép TZ=UTC mới đúng —
 * xem chú thích ở `_common/entities/base.entity.ts`.)
 */

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
      // KHÔNG bật `enableImplicitConversion`.
      //
      // Với class-transformer, `enableImplicitConversion: true` + `@IsArray()`
      // trên property khai kiểu `object[]` (design:type = Array) sẽ khiến MỖI
      // PHẦN TỬ của mảng bị đưa qua `Array.from(phanTu)`. Mà
      // `Array.from({ type: 'multiple_choice', ... })` trả về `[]`
      // -> `content: [{...}]` biến thành `[[]]`: mất sạch nội dung đề.
      //
      // Không cần ép kiểu ngầm ở đây: body là JSON nên số/chuỗi đã đúng kiểu,
      // còn mọi query param đều đi qua ParseIntPipe / ParseLimitPipe.
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
  // ném lỗi ngay nếu production mà thiếu FE_URL
  assertCorsConfigured();

  // Fail-fast các cấu hình NGUY HIỂM khi thiếu ở production:
  //
  // 1. synchronize = true sẽ để TypeORM tự ALTER/DROP bảng — mất dữ liệu thật.
  // 2. Thiếu JWT secret thì mọi token đều sign/verify bằng secret rỗng (có thể
  //    chạy được nhưng bảo mật bằng 0).
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DB_SYNCHRONIZE !== 'false') {
      throw new Error(
        'DB_SYNCHRONIZE phải = "false" ở production — tránh TypeORM tự sửa schema.',
      );
    }
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        'Thiếu JWT_ACCESS_SECRET / JWT_REFRESH_SECRET ở production.',
      );
    }
  }

  app.enableCors({
    // dạng callback: đọc FE_URL ở từng request và hỗ trợ danh sách nhiều origin
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => callback(null, isOriginAllowed(origin)),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();














