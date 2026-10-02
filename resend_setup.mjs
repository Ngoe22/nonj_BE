/**
 * In bản ghi DNS cần dán vào Cloudflare + trạng thái verify.
 *
 *   node resend_setup.mjs           # xem trạng thái + bản ghi DNS
 *   node resend_setup.mjs verify    # gọi Resend kiểm tra lại ngay
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

const DOMAIN = 'nonj.site';
const headers = {
  Authorization: `Bearer ${env.RESEND_API_KEY}`,
  'Content-Type': 'application/json',
};

const list = await (await fetch('https://api.resend.com/domains', { headers })).json();
const domain = (list.data ?? []).find((d) => d.name === DOMAIN);

if (!domain) {
  console.error(`✗ Chưa có domain ${DOMAIN} trong Resend`);
  process.exit(1);
}

// Xem chi tiết (kèm records)
const detail = await (
  await fetch(`https://api.resend.com/domains/${domain.id}`, { headers })
).json();

if (process.argv.includes('verify')) {
  const r = await fetch(`https://api.resend.com/domains/${domain.id}/verify`, {
    method: 'POST',
    headers,
  });
  console.log(`Đã yêu cầu verify -> HTTP ${r.status}`);
  console.log('Chờ ~30 giây rồi chạy lại không có tham số để xem kết quả.\n');
}

console.log('═'.repeat(76));
console.log(`DOMAIN: ${detail.name}    STATUS: ${detail.status}`);
console.log('═'.repeat(76));

for (const r of detail.records ?? []) {
  const mark = r.status === 'verified' ? '✓' : '·';
  console.log(`\n${mark} ${r.type}  ${r.name}`);
  if (r.type === 'MX') {
    console.log(`   Mail server : ${r.value}`);
    console.log(`   Priority    : ${r.priority}`);
    console.log('   Proxy       : (MX không proxy được)');
  } else {
    console.log(`   Content     : ${r.value}`);
    console.log(
      r.type === 'CNAME'
        ? '   Proxy       : DNS only (mây XÁM)'
        : '   Proxy       : (TXT không proxy được)',
    );
  }
  console.log(`   Trạng thái  : ${r.status ?? '—'}`);
}

console.log('\n' + '═'.repeat(76));
console.log('Name chỉ ghi phần đầu — Cloudflare tự nối .nonj.site phía sau.');
console.log('═'.repeat(76));
