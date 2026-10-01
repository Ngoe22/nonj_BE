/**
 * Cấu hình CORS dùng chung cho HTTP (Express) và WebSocket (socket.io).
 *
 * `FE_URL` nhận DANH SÁCH nhiều origin, phân tách bằng dấu phẩy — cần cho Vercel:
 * mỗi preview deployment có URL khác nhau, production lại một URL khác.
 *
 * ⚠️ Không gọi các hàm này ở tầng decorator của gateway: decorator chạy lúc NẠP
 * MODULE, tức TRƯỚC khi `ConfigModule.forRoot()` nạp file .env -> `process.env.FE_URL`
 * còn undefined. Gateway dùng dạng callback để đọc biến ở LÚC CÓ KẾT NỐI.
 */

export function getAllowedOrigins(): string[] {
  return (process.env.FE_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Origin này có được phép không (đọc env ở thời điểm gọi) */
export function isOriginAllowed(requestOrigin: string | undefined): boolean {
  const allowed = getAllowedOrigins();

  // Chưa cấu hình: chỉ cho qua ở môi trường không phải production
  if (allowed.length === 0) return process.env.NODE_ENV !== 'production';

  // Request không phải từ trình duyệt (không có Origin) -> không cho qua
  if (!requestOrigin) return false;

  return allowed.includes(requestOrigin);
}

/**
 * Gọi lúc bootstrap (dotenv đã nạp xong). Ném lỗi ngay khi khởi động nếu
 * production mà quên đặt FE_URL — để không âm thầm mở CORS cho mọi origin.
 */
export function assertCorsConfigured(): void {
  if (process.env.NODE_ENV === 'production' && getAllowedOrigins().length === 0) {
    throw new Error(
      'Thiếu FE_URL ở production. Đặt danh sách origin, phân tách bằng dấu phẩy.',
    );
  }
}
