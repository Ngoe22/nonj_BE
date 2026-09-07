import { SetMetadata } from '@nestjs/common';

/**
 * Key dùng để lưu/đọc metadata "public" trên route hoặc controller.
 * Đặt thành hằng số để tránh gõ nhầm chuỗi ở guard và decorator.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Đánh dấu 1 route (hoặc cả 1 controller) là public,
 * bỏ qua bước xác thực của AuthGuard khi AuthGuard được đăng ký global (APP_GUARD).
 *
 * Dùng cho route: chỉ route đó public.
 *   @Public()
 *   @Post('login')
 *   async login() { ... }
 *
 * Dùng cho cả controller: mọi route trong controller đều public.
 *   @Public()
 *   @Controller('health')
 *   export class HealthController { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
