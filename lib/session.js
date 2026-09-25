const crypto = require('crypto');

const SESSION_COOKIE = 'rp_strava';
const STATE_COOKIE = 'rp_oauth_state';

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) throw new Error('SESSION_SECRET must be at least 24 characters.');
  return crypto.createHash('sha256').update(secret).digest();
}

function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.');
}

function unseal(token) {
  if (!token) return null;
  try {
    const [ivPart, tagPart, encryptedPart] = token.split('.');
    if (!ivPart || !tagPart || !encryptedPart) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedPart, 'base64url')), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const index = item.indexOf('=');
    return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
  }));
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function appendCookie(res, value) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) res.setHeader('Set-Cookie', value);
  else if (Array.isArray(existing)) res.setHeader('Set-Cookie', [...existing, value]);
  else res.setHeader('Set-Cookie', [existing, value]);
}

function setSession(res, payload) {
  appendCookie(res, cookie(SESSION_COOKIE, seal(payload), 60 * 60 * 24 * 7));
}

function getSession(req) {
  return unseal(parseCookies(req)[SESSION_COOKIE]);
}

function clearSession(res) {
  appendCookie(res, clearCookie(SESSION_COOKIE));
}

function setOauthState(res, payload) {
  appendCookie(res, cookie(STATE_COOKIE, seal(payload), 60 * 10));
}

function getOauthState(req) {
  return unseal(parseCookies(req)[STATE_COOKIE]);
}

function clearOauthState(res) {
  appendCookie(res, clearCookie(STATE_COOKIE));
}

function signPayload(payload, maxAgeSeconds = 900) {
  const body = Buffer.from(JSON.stringify({ ...payload, issuedAt: Date.now(), maxAgeSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', secretKey()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyPayload(token) {
  if (!token) return null;
  const index = token.lastIndexOf('.');
  if (index < 1) return null;
  const body = token.slice(0, index);
  const signature = token.slice(index + 1);
  const expected = crypto.createHmac('sha256', secretKey()).update(body).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (Date.now() - payload.issuedAt > payload.maxAgeSeconds * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  setSession, getSession, clearSession,
  setOauthState, getOauthState, clearOauthState,
  signPayload, verifyPayload
};
