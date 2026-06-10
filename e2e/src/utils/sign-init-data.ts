import crypto from 'node:crypto';

/**
 * Build a *validly signed* Telegram Mini App `initData` string for tests — the same
 * thing Telegram hands a Mini App on launch, so the backend's HMAC check accepts it.
 *
 * Algorithm (must match the server's validator):
 *   data_check_string = sorted "key=value" pairs (except hash), joined by "\n"
 *   secret            = HMAC_SHA256(key="WebAppData", msg=botToken)
 *   hash              = hex(HMAC_SHA256(key=secret, msg=data_check_string))
 *
 * Tamper with any field or use the wrong token → the hash won't match → backend 401.
 * That gives both the happy path (sign correctly) and the security negative (forge it).
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
