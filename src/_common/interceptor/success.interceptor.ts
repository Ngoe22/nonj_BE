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
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        return next.handle().pipe(
            map((data) => ({
                statusCode: statusCode,
                message: 'Success',
                data: data || null,
                timestamp: new Date().toISOString(),
            })),
        );
    }
}


// // Định nghĩa 1 lần duy nhất: Chữ T là một ô trống đang đợi điền thông tin
// export interface ApiResponse<T> {
//     statusCode: number;
//     message: string;
//     data: T; // Kiểu dữ liệu của data sẽ phụ thuộc vào chữ T truyền vào
// }