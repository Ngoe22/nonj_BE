// transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}


@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
      const ctx = context.switchToHttp();
      const request = ctx.getRequest();
      const response = ctx.getResponse();
      const statusCode = response.statusCode;

        return next.handle().pipe(
          map((data) => ({
            path: request.path,
            statusCode: statusCode,
            message: 'Success',
            // `?? null` thay vì `|| null`: `false`/`0`/`''` là giá trị HỢP LỆ.
            // Trước đây `|| null` nuốt `false` của endpoint check_existing ->
            // FE phải so `=== true` thay vì nhận `false` đúng nghĩa "chưa ai dùng".
            data: data ?? null,
            timestamp: new Date().toISOString(),
          })),
        );
    }
}


