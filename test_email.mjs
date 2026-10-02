/**
 * Kiểm tra domain Resend + gửi thử 1 email.
 *
 *   node test_email.mjs                       # chỉ xem trạng thái domain
 *   node test_email.mjs ban@example.com       # gửi mail thử tới địa chỉ này
 *
 * Vì sao cần script: `RESEND_API_KEY` có thể hợp lệ mà domain CHƯA verify, khi đó
 * mọi lần gửi đều 403 `validation_error` — lỗi bị nuốt thành 503
 * `email_send_failed` ở tầng API nên rất khó đoán. Script này nói thẳng ra.
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
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

const key = env.RESEND_API_KEY;
if (!key) {
  console.error('✗ Thiếu RESEND_API_KEY trong .env');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

// ---------- 1. Trạng thái domain ----------
const listRes = await fetch('https://api.resend.com/domains', { headers });
const list = await listRes.json();
const domains = list.data ?? [];

console.log('DOMAIN TRONG RESEND:');
if (domains.length === 0) {
  console.log('  (chưa có domain nào)');
}
for (const d of domains) {
  const ok = d.status === 'verified';
  console.log(`  ${ok ? '✓' : '·'} ${d.name.padEnd(20)} status = ${d.status}`);
}
console.log();

const target = domains.find((d) => d.name === 'nonj.site');
const verified = target?.status === 'verified';

if (!verified) {
  console.log('⚠️  Domain chưa verified -> gửi mail sẽ LUÔN thất bại.');
  console.log('    Cần thêm đủ bản ghi DNS ở Cloudflare rồi bấm Verify.');
  console.log('    Xem: resend-dns-records.txt\n');
}

// ---------- 2. Gửi thử ----------
const to = process.argv[2];

if (!to) {
  console.log('Chưa truyền địa chỉ nhận. Muốn gửi thử thì chạy:');
  console.log('  node test_email.mjs ban@example.com');
  process.exit(verified ? 0 : 1);
}

console.log(`Đang gửi thử tới ${to} ...`);
console.log(`  from: ${env.MAIL_FROM}`);

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    from: env.MAIL_FROM,
    to,
    subject: '[NONJ] Test gửi mail',
    html: `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>NONJ — test gửi mail</h2>
        <p>Nếu bạn đọc được mail này thì cấu hình Resend đã chạy.</p>
        <p>From: <b>${env.MAIL_FROM}</b></p>
      </div>
    `,
  }),
});

const body = await res.json();

if (res.ok) {
  console.log(`✓ ĐÃ GỬI. id = ${body.id}`);
  console.log('  Kiểm tra hộp thư (cả mục Spam).');
} else {
  console.log(`✗ LỖI HTTP ${res.status}`);
  console.log(`  ${body.message ?? JSON.stringify(body)}`);
  process.exit(1);
}
