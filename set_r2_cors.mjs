/**
 * Đặt CORS cho bucket R2.
 *
 * Vì sao cần: FE upload ẢNH/MP3 bằng cách PUT TRỰC TIẾP từ browser lên R2 (presigned
 * URL). Đó là request cross-origin kèm header Content-Type nên browser bắn preflight
 * OPTIONS; bucket không có CORS thì R2 trả về thiếu `Access-Control-Allow-Origin` và
 * browser chặn -> "Upload failed".
 *
 *   node set_r2_cors.mjs            # xem + đặt CORS
 *   node set_r2_cors.mjs --show     # chỉ xem
 *
 * Nguồn được phép lấy từ FE_URL trong .env (CÙNG biến BE dùng cho CORS) cộng
 * localhost, nên chỉ cần sửa 1 chỗ khi đổi domain.
 */
import { readFileSync } from 'node:fs';
import {
  S3Client,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';

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

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = env.R2_BUCKET_NAME;

const origins = [
  ...(env.FE_URL
    ? env.FE_URL.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []),
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const CORSRules = [
  {
    AllowedOrigins: [...new Set(origins)],
    AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedHeaders: ['*'],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  },
];

console.log('CORS hiện tại của bucket', bucket, ':');
try {
  const current = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log(JSON.stringify(current.CORSRules, null, 2));
} catch (error) {
  console.log('  (chưa có CORS —', error.name, ')');
}

if (process.argv.includes('--show')) process.exit(0);

await s3.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules },
  }),
);

console.log('\n✓ Đã đặt CORS:');
console.log(JSON.stringify(CORSRules, null, 2));
