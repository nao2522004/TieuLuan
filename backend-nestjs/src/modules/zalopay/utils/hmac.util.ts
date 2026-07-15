import * as crypto from 'crypto';

export function hmacSHA256(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}
