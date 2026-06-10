import crypto from 'node:crypto';

/**
 * Build a validly signed Mini App `initData` for tests (HMAC must match the server's validator):
 * secret = HMAC_SHA256("WebAppData", botToken); hash = HMAC_SHA256(secret, sorted key=value lines).
 * Wrong field/token → hash mismatch → 401, which covers both the happy path and forgery tests.
 */
export function buildSignedInitData(
  user: Record<string, unknown>,
  botToken: string,
  extra: Record<string, string> = {},
): string {
  const fields: Record<string, string> = {
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAtest',
    ...extra,
  };

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  return new URLSearchParams({ ...fields, hash }).toString();
}
