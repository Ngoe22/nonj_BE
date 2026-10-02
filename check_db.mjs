/**
 * Kiểm tra kết nối database + tình trạng schema.
 *
 *   node check_db.mjs
 *
 * Dùng cho lúc chuẩn bị deploy (vd trỏ sang Supabase): nói thẳng ra đang sai gì
 * thay vì để TypeORM ném lỗi khó hiểu lúc BE khởi động.
 *
 * Script CHỈ ĐỌC — không tạo/sửa gì. Muốn chạy migration thì dùng
 * `npm run migration:run`.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

// ---------- đọc .env (không cần dotenv) ----------
function readEnv() {
  try {
    return Object.fromEntries(
      readFileSync('.env', 'utf8')
        .split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          return [
            l.slice(0, i).trim(),
            l.slice(i + 1).trim().replace(/^['"]|['"]$/g, ''),
          ];
        }),
    );
  } catch {
    console.error('✗ Không đọc được .env (chạy script trong thư mục nonj_be)');
    process.exit(1);
  }
}

const fileEnv = readEnv();
// Biến môi trường THẬT thắng .env -> test nhanh được mà không phải sửa file:
//   DB_HOST=... DB_PASSWORD=... npm run db:check
const env = (key) =>
  process.env[key] !== undefined ? process.env[key] : fileEnv[key];

const cfg = {
  host: env('DB_HOST'),
  port: Number(env('DB_PORT') || 5432),
  user: env('DB_USER'),
  password: env('DB_PASSWORD'),
  database: env('DB_NAME'),
};
const useSsl = env('DB_SSL') === 'true';

console.log('─'.repeat(60));
console.log('  CẤU HÌNH ĐANG DÙNG (đọc từ .env)');
console.log('─'.repeat(60));
console.log(`  host     : ${cfg.host}`);
console.log(`  port     : ${cfg.port}`);
console.log(`  user     : ${cfg.user}`);
console.log(`  database : ${cfg.database}`);
console.log(`  password : ${cfg.password ? '***' + String(cfg.password).slice(-2) : '(TRỐNG!)'}`);
console.log(`  ssl      : ${useSsl ? 'BẬT' : 'tắt'}`);
console.log();

const thieu = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter((k) => !env(k));
if (thieu.length) {
  console.error(`✗ Thiếu biến trong .env: ${thieu.join(', ')}`);
  process.exit(1);
}

// ---------- cảnh báo cấu hình hay sai ----------
const host = String(cfg.host || '');
if (host.includes('supabase.co') && !host.includes('pooler')) {
  console.log('⚠️  Bạn đang dùng host DIRECT của Supabase (db.xxx.supabase.co).');
  console.log('   Host này hiện chỉ có IPv6 -> nhiều mạng VN không kết nối được.');
  console.log('   Nên dùng host SESSION POOLER (...pooler.supabase.com).');
  console.log();
}
if (cfg.port === 6543) {
  console.log('⚠️  Cổng 6543 = TRANSACTION pooler. BE dùng transaction nên sẽ hỏng.');
  console.log('   Đổi sang cổng 5432 (Session pooler).');
  console.log();
}
if (host.includes('supabase') && !useSsl) {
  console.log('⚠️  Supabase BẮT BUỘC SSL -> cần DB_SSL=true trong .env.');
  console.log();
}

// ---------- kết nối ----------
const client = new pg.Client({
  ...cfg,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
});

const start = Date.now();
try {
  await client.connect();
  const ms = Date.now() - start;

  const ver = await client.query('SELECT version() AS v');
  const tbl = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'`,
  );
  const hasMigrations = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema='public' AND table_name='migrations'`,
  );
  let applied = 0;
  if (hasMigrations.rows[0].n > 0) {
    const r = await client.query('SELECT count(*)::int AS n FROM migrations');
    applied = r.rows[0].n;
  }

  console.log('─'.repeat(60));
  console.log(`  ✅ KẾT NỐI THÀNH CÔNG  (${ms} ms)`);
  console.log('─'.repeat(60));
  console.log(`  ${String(ver.rows[0].v).split(' ').slice(0, 2).join(' ')}`);
  console.log(`  số bảng trong public : ${tbl.rows[0].n}`);
  console.log(`  bảng "migrations"    : ${hasMigrations.rows[0].n ? 'có' : 'CHƯA CÓ'}`);
  console.log(`  migration đã chạy    : ${applied}`);
  console.log();

  if (tbl.rows[0].n <= 1) {
    console.log('  ➜ Database còn TRỐNG. Chạy:  npm run migration:run');
  } else if (applied === 0) {
    console.log('  ➜ Có bảng nhưng CHƯA migration nào chạy.');
    console.log('     (DB local dev thì bình thường — schema do synchronize tạo.)');
    console.log('     Nếu đây là Supabase MỚI mà đã có bảng -> kiểm tra lại đúng project chưa.');
  } else {
    console.log(`  ➜ Schema do migration quản lý (${applied} migration). Deploy được.`);
  }

  await client.end();
  process.exit(0);
} catch (error) {
  console.log('─'.repeat(60));
  console.log('  ✗ KẾT NỐI THẤT BẠI');
  console.log('─'.repeat(60));
  console.log(`  mã lỗi : ${error.code ?? '(không có)'}`);
  console.log(`  nội dung: ${error.message}`);
  console.log();

  const hints = {
    ENOTFOUND:
      'Sai host, hoặc host chỉ có IPv6. Kiểm tra lại DB_HOST — nên là host pooler.',
    ETIMEDOUT:
      'Hết thời gian chờ: firewall/mạng chặn, hoặc sai host. Thử ping host.',
    ECONNREFUSED: 'Sai cổng, hoặc DB không nhận kết nối từ ngoài.',
    ECONNRESET: 'Kết nối bị ngắt giữa chừng — thường do SSL sai (thử DB_SSL=true).',
    '28P01':
      'SAI USER hoặc MẬT KHẨU (Postgres trả cùng mã cho cả hai). Supabase: user phải có dạng postgres.xxxxx, mật khẩu là cái bạn Generate lúc tạo project.',
    '3D000': 'Database không tồn tại. Supabase thì DB_NAME phải là "postgres".',
    '28000':
      'Bị từ chối xác thực. Với Supabase: kiểm tra user phải có dạng postgres.xxxxx',
    '42P01': 'Không tìm thấy bảng — schema chưa tạo, chạy npm run migration:run.',
  };
  const hint = hints[error.code];
  if (hint) console.log(`  💡 ${hint}`);

  if (String(error.message).toLowerCase().includes('ssl')) {
    console.log('  💡 Lỗi liên quan SSL: Supabase cần DB_SSL=true.');
  }
  if (cfg.password && /[@:/?#\[\]]/.test(cfg.password)) {
    console.log(
      '  💡 Mật khẩu có ký tự đặc biệt (@ : / ? #) — phải URL-encode khi dán vào chuỗi URL.',
    );
  }

  await client.end().catch(() => {});
  process.exit(1);
}
