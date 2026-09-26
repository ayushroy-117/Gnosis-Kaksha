#!/usr/bin/env node
// Generates fresh secrets for a self-hosted Supabase instance.
// Usage: node deploy/scripts/gen-secrets.mjs >> supabase-docker/.env
// Prints KEY=value lines. Never commit the output.
import crypto from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const rand = (bytes) => crypto.randomBytes(bytes).toString('hex');

function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(sig)}`;
}

const jwtSecret = rand(32);
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 3600; // 10 years, same as Supabase's generated keys

const out = {
  POSTGRES_PASSWORD: rand(24),
  JWT_SECRET: jwtSecret,
  ANON_KEY: signJwt({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret),
  SERVICE_ROLE_KEY: signJwt({ role: 'service_role', iss: 'supabase', iat, exp }, jwtSecret),
  DASHBOARD_PASSWORD: rand(16),
  SECRET_KEY_BASE: rand(32),
  VAULT_ENC_KEY: rand(16),
  PG_META_CRYPTO_KEY: rand(16),
  LOGFLARE_PUBLIC_ACCESS_TOKEN: rand(24),
  LOGFLARE_PRIVATE_ACCESS_TOKEN: rand(24),
};

for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
