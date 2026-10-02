import { DataSource } from 'typeorm';

/**
 * DataSource dùng cho TypeORM CLI (`migration:generate` / `migration:run` / ...).
 *
 * ⚠️ Trỏ vào file ĐÃ BIÊN DỊCH (`dist/`), không phải `src/`:
 * dự án là pure ESM (`"type": "module"` + `module: nodenext`) nên chạy CLI qua
 * ts-node rất dễ vỡ. Cách chắc chắn là build trước rồi cho CLI đọc `dist`.
 * Vì vậy các script `migration:*` đều `npm run build` trước.
 *
 * Env được nạp bằng `node --env-file=.env` trong script (Node >= 20.6), không
 * cần thêm `dotenv` làm dependency thật.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Supabase (và hầu hết Postgres managed) BẮT BUỘC SSL
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
});
