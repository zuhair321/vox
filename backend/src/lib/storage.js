// Object storage adapter (roadmap Month 1: move uploads to S3 + CDN).
// When AWS_S3_BUCKET / AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
// are set, uploads go to S3 (or R2/Backblaze via a compatible endpoint) and are
// served through AWS_S3_PUBLIC_URL (or a CloudFront/CDN in front). Otherwise the
// app keeps using local disk under /uploads — fully backward compatible.
import crypto from 'node:crypto';

const BUCKET = process.env.AWS_S3_BUCKET || '';
const REGION = process.env.AWS_REGION || 'us-east-1';
const KEY = process.env.AWS_ACCESS_KEY_ID || '';
const SECRET = process.env.AWS_SECRET_ACCESS_KEY || '';
const ENDPOINT = process.env.AWS_S3_ENDPOINT || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
const PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL || ENDPOINT;

export const STORAGE_MODE = BUCKET && KEY && SECRET ? 's3' : 'local';

export function getStorageInfo() {
  return { mode: STORAGE_MODE, publicUrl: PUBLIC_URL };
}

export function getPublicUrl(key) {
  if (STORAGE_MODE === 's3') return `${PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return `/uploads/${key}`;
}

// AWS Signature V4 presigned PUT URL (UNSIGNED-PAYLOAD) so the browser can
// upload directly to S3 without the backend touching the bytes.
export function presignPutUrl(key, contentType = 'application/octet-stream', expiresSec = 900) {
  if (STORAGE_MODE !== 's3') return null;
  const url = new URL(`${ENDPOINT.replace(/\/$/, '')}/${key}`);
  const host = url.host;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15);
  const dateStamp = amzDate.slice(0, 8);

  const qp = new URLSearchParams();
  qp.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  qp.set('X-Amz-Credential', `${KEY}/${dateStamp}/${REGION}/s3/aws4_request`);
  qp.set('X-Amz-Date', amzDate);
  qp.set('X-Amz-Expires', String(expiresSec));
  qp.set('X-Amz-SignedHeaders', 'host;x-amz-content-sha256;x-amz-date');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    qp.toString(),
    canonicalHeaders,
    'host;x-amz-content-sha256;x-amz-date',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const kDate = hmac(`AWS4${SECRET}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  qp.set('X-Amz-Signature', signature);
  return `${url.origin}${url.pathname}?${qp.toString()}`;
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}
