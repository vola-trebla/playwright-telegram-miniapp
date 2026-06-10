import crypto from 'node:crypto';

export interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface ValidationResult {
  ok: boolean;
  user?: TgUser;
}

/**
 * Server-side Telegram Mini App `initData` validation — the exact check MRKT's
 * backend must run to trust `user.id`. Per Telegram docs:
 *
 *   secret = HMAC_SHA256(key="WebAppData", msg=botToken)
 *   hash   = HMAC_SHA256(key=secret, msg=sorted "key=value" pairs joined by "\n")
 *
 * A tampered field or wrong token changes the hash → rejected.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 60 * 60,
): ValidationResult {
  if (!initData) return { ok: false };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false };

  const fields: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') fields[key] = value;
  }

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (expected !== hash) return { ok: false };

  // Freshness: reject a stale (replayed) or future-dated auth_date even if the signature is
  // valid — without this a captured initData could be replayed indefinitely.
  const authDate = Number(fields.auth_date);
  if (!Number.isFinite(authDate)) return { ok: false };
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds > maxAgeSeconds || ageSeconds < -60) return { ok: false };

  let user: TgUser | undefined;
  try {
    user = JSON.parse(fields.user ?? '{}') as TgUser;
  } catch {
    user = undefined;
  }
  return { ok: true, user };
}
