/* 로그인 공용 유틸 — 브라우저로 내려가지 않습니다.

   환경변수
     SESSION_SECRET   쿠키 서명용. 길고 무작위한 문자열.
                      노출되면 남이 아무 계정으로나 로그인한 척할 수 있습니다.

   비밀번호는 절대 그대로 저장하지 않습니다. scrypt 로 해시해 저장하고,
   확인할 때는 같은 salt 로 다시 해시해 시간차 없는 비교(timingSafeEqual)를 씁니다.
   그래서 데이터베이스를 통째로 가져가도 원래 비밀번호는 알 수 없습니다. */

const crypto = require('crypto');

const COOKIE = 'eum_s';
const MAX_AGE = 60 * 60 * 24 * 14;          // 14일
const SCRYPT = { N: 16384, r: 8, p: 1, len: 64 };

/* ---------- 비밀번호 ---------- */

function scrypt(pw, salt) {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(pw, salt, SCRYPT.len, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p },
      function (err, buf) { if (err) reject(err); else resolve(buf); });
  });
}

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const buf = await scrypt(pw, salt);
  return 'scrypt$' + SCRYPT.N + '$' + salt.toString('base64') + '$' + buf.toString('base64');
}

async function verifyPassword(pw, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
    const salt = Buffer.from(parts[2], 'base64');
    const want = Buffer.from(parts[3], 'base64');
    const got = await scrypt(pw, salt);
    if (got.length !== want.length) return false;
    return crypto.timingSafeEqual(got, want);
  } catch (e) {
    return false;
  }
}

/* ---------- 세션 쿠키 ---------- */

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET not set');
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payloadB64) {
  return b64url(crypto.createHmac('sha256', secret()).update(payloadB64).digest());
}

function makeToken(user) {
  const payload = b64url(JSON.stringify({
    uid: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE
  }));
  return payload + '.' + sign(payload);
}

function readToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const expect = Buffer.from(sign(parts[0]));
    const got = Buffer.from(parts[1]);
    if (expect.length !== got.length) return null;
    if (!crypto.timingSafeEqual(expect, got)) return null;

    const data = JSON.parse(unb64url(parts[0]).toString('utf8'));
    if (!data || !data.uid || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: data.uid, username: data.username };
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const raw = (req.headers && req.headers.cookie) || '';
  const out = {};
  String(raw).split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function setSession(res, user) {
  res.setHeader('set-cookie',
    COOKIE + '=' + makeToken(user) +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + MAX_AGE);
}

function clearSession(res) {
  res.setHeader('set-cookie',
    COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

/* 로그인한 사용자면 {uid, username}, 아니면 null */
function currentUser(req) {
  return readToken(parseCookies(req)[COOKIE]);
}

/* ---------- 입력 검사 ---------- */

const ID_RE = /^[a-z0-9_]{4,20}$/;

function normalizeId(v) {
  return String(v || '').trim().toLowerCase();
}

function checkId(v) {
  return ID_RE.test(v) ? null : 'errIdRule';
}

function checkPw(v) {
  return String(v || '').length >= 8 && String(v).length <= 200 ? null : 'errPwRule';
}

module.exports = {
  hashPassword, verifyPassword,
  setSession, clearSession, currentUser,
  normalizeId, checkId, checkPw
};
