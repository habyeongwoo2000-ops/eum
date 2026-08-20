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
    // 화면에 보이는 이름. 닉네임을 바꾸면 쿠키를 다시 발급해 여기도 갱신합니다.
    nick: user.nickname || user.username,
    // 관리자 여부. 게시판에서 답변 칸을 보일지 여기로 정합니다.
    adm: !!user.is_admin,
    // 계정에 저장된 언어. 다른 기기로 로그인해도 이 언어로 화면이 맞춰집니다.
    lng: user.lang || null,
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
    return {
      uid: data.uid,
      username: data.username,
      nickname: data.nick || data.username,
      isAdmin: !!data.adm,
      lang: data.lng || null
    };
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

/* 쿠키를 덮어쓰지 않고 덧붙입니다.
   소셜 로그인 콜백에서는 세션 쿠키를 심는 동시에 임시 쿠키를 지워야 해서,
   set-cookie 를 한 번만 쓰면 둘 중 하나가 사라집니다. */
function appendCookie(res, value) {
  const prev = res.getHeader('set-cookie');
  const list = prev ? (Array.isArray(prev) ? prev.slice() : [prev]) : [];
  list.push(value);
  res.setHeader('set-cookie', list);
}

function setSession(res, user) {
  appendCookie(res,
    COOKIE + '=' + makeToken(user) +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + MAX_AGE);
}

function clearSession(res) {
  appendCookie(res,
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

/* 닉네임 — 아이디와 달리 한글·베트남어·태국어를 그대로 쓸 수 있게 열어 둡니다.
   대신 화면을 망가뜨리거나 남을 헷갈리게 하는 글자만 막습니다.
     · 앞뒤 공백, 연속된 공백
     · 줄바꿈과 눈에 보이지 않는 제어문자
     · 꺾쇠(< >)와 따옴표 — 화면에 그대로 박히면 읽기 어렵습니다 */
function normalizeNick(v) {
  return String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
}

function checkNick(v) {
  const s = String(v || '');
  if (s.length < 2 || s.length > 20) return 'errNickRule';
  if (/[<>"'\\/]/.test(s)) return 'errNickChar';
  return null;
}

/* ---------- 언어 ---------- */

const LANG_CODES = ['ko', 'en', 'vi', 'th', 'id'];

function normalizeLang(v) {
  return LANG_CODES.indexOf(v) !== -1 ? v : null;
}

/* ---------- 소셜 계정용 ---------- */

/* 소셜로 처음 들어온 사람에게 줄 아이디를 무작위로 만듭니다.
   구글 이름이나 카카오 닉네임을 쓰지 않는 이유는, 게시판에 실명이 그대로
   드러나면 사업주가 글쓴이를 특정할 수 있기 때문입니다.
   'user_' + 8자리 = 13자 → 기존 규칙(4~20자) 안에 들어옵니다. */
function randomUsername() {
  return 'user_' + crypto.randomBytes(4).toString('hex');
}

module.exports = {
  hashPassword, verifyPassword,
  setSession, clearSession, currentUser, appendCookie,
  normalizeId, checkId, checkPw,
  randomUsername, normalizeNick, checkNick,
  LANG_CODES, normalizeLang,
  b64url, unb64url, sign
};
