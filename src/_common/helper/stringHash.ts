import { createHash } from 'node:crypto';

export function stringHash(input :string) {
  return createHash('sha256').update(input).digest('hex');
}