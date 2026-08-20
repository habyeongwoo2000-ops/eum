/* 소셜 로그인 공용 — 브라우저로 내려가지 않습니다.

   구조
     1) /api/oauth/start?p=google  → 임시 쿠키를 심고 제공자 로그인 화면으로 보냅니다.
     2) 제공자가 /api/oauth/google?code=..&state=.. 로 되돌려 보냅니다.
     3) code 를 토큰으로 바꾸고, 그 토큰으로 "누구인지"만 물어봅니다.
     4) 그 사람 계정을 찾거나 새로 만들고 기존 세션 쿠키를 심습니다.

   무엇을 저장하지 않는가
     이름, 이메일, 프로필 사진, 성별, 나이 — 전부 저장하지 않습니다.
     제공자가 준 고유 번호(sub / id)만 남깁니다. 이 서비스는 근로자의 신원이
     드러나면 안 되는 서비스라, 받을 수 있어도 받지 않는 쪽을 골랐습니다.

   환경변수 (없으면 그 제공자 버튼은 화면에서 자동으로 숨습니다)
     GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
     KAKAO_CLIENT_ID  / KAKAO_CLIENT_SECRET   (카카오는 secret 이 선택입니다)
     PUBLIC_BASE_URL  예) https://eum.vercel.app
                      제공자 콘솔에 등록한 주소와 글자 하나까지 같아야 합니다. */

const crypto = require('crypto');
const { sb } = require('./_db');
const A = require('./_auth');

const STATE_COOKIE = 'eum_oa';
const STATE_MAX_AGE = 600;                 // 10분. 로그인 화면에서 머뭇거려도 넉넉합니다.

const PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid',
    idKey: 'sub',
    idEnv: 'GOOGLE_CLIENT_ID',
    secretEnv: 'GOOGLE_CLIENT_SECRET',
    secretRequired: true,
    usePkce: true
  },
  kakao: {
    authUrl: 'https://kauth.kakao.com/oauth/authorize',
    tokenUrl: 'https://kauth.kakao.com/oauth/token',
    userUrl: 'https://kapi.kakao.com/v2/user/me',
    scope: '',                             // 동의항목을 하나도 요구하지 않아도 id 는 옵니다
    idKey: 'id',
    idEnv: 'KAKAO_CLIENT_ID',              // 카카오 개발자센터의 REST API 키
    secretEnv: 'KAKAO_CLIENT_SECRET',
    secretRequired: false,
    usePkce: true
  }
};

function conf(name) {
  const p = PROVIDERS[name];
  if (!p) return null;
  const id = process.env[p.idEnv];
  const secret = process.env[p.secretEnv];
  if (!id) return null;
  if (p.secretRequired && !secret) return null;
  return Object.assign({ name: name, clientId: id, clientSecret: secret || '' }, p);
}

/* 어떤 제공자가 실제로 켜져 있는지 — 화면에서 버튼을 보일지 정할 때 씁니다. */
function enabledProviders() {
  return Object.keys(PROVIDERS).filter(function (n) { return !!conf(n); });
}

/* 콜백 주소. 제공자 콘솔에 등록하는 값과 반드시 같아야 합니다. */
function baseUrl(req) {
  const fixed = process.env.PUBLIC_BASE_URL;
  if (fixed) return String(fixed).replace(/\/+$/, '');
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + host;
}

function redirectUri(req, name) {
  return baseUrl(req) + '/api/oauth/' + name;
}

/* ---------- 임시 상태 (CSRF 방지 + PKCE) ---------- */

/* state 를 쿠키와 주소 양쪽에 넣고 콜백에서 맞춰 봅니다.
   공격자가 만든 콜백 주소를 사용자가 눌러도 쿠키가 없어서 통과하지 못합니다. */
function packState(data) {
  const payload = A.b64url(JSON.stringify(data));
  return payload + '.' + A.sign(payload);
}

function unpackState(raw) {
  try {
    const parts = String(raw || '').split('.');
    if (parts.length !== 2) return null;
    const want = Buffer.from(A.sign(parts[0]));
    const got = Buffer.from(parts[1]);
    if (want.length !== got.length) return null;
    if (!crypto.timingSafeEqual(want, got)) return null;
    const data = JSON.parse(A.unb64url(parts[0]).toString('utf8'));
    if (!data || !data.n || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function setStateCookie(res, value) {
  A.appendCookie(res,
    STATE_COOKIE + '=' + value +
    '; Path=/api/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=' + STATE_MAX_AGE);
}

function clearStateCookie(res) {
  A.appendCookie(res,
    STATE_COOKIE + '=; Path=/api/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

function readStateCookie(req) {
  const raw = (req.headers && req.headers.cookie) || '';
  let found = null;
  String(raw).split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i < 0) return;
    if (part.slice(0, i).trim() === STATE_COOKIE) {
      found = decodeURIComponent(part.slice(i + 1).trim());
    }
  });
  return found;
}

/* PKCE — 가로챈 code 만으로는 토큰을 못 바꾸게 합니다. */
function makeVerifier() {
  return A.b64url(crypto.randomBytes(32));
}

function challengeOf(verifier) {
  return A.b64url(crypto.createHash('sha256').update(verifier).digest());
}

/* ---------- 토큰 교환 + 신원 확인 ---------- */

async function exchangeCode(c, req, code, verifier) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: c.clientId,
    redirect_uri: redirectUri(req, c.name),
    code: code
  });
  if (c.clientSecret) form.set('client_secret', c.clientSecret);
  if (c.usePkce && verifier) form.set('code_verifier', verifier);

  const r = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const text = await r.text();
  if (!r.ok) throw new Error('token ' + r.status + ' ' + text.slice(0, 200));

  const data = JSON.parse(text);
  if (!data.access_token) throw new Error('no access_token');
  return data.access_token;
}

/* 고유 번호만 꺼내고 나머지 응답은 버립니다. */
async function fetchUid(c, accessToken) {
  const r = await fetch(c.userUrl, {
    headers: { authorization: 'Bearer ' + accessToken }
  });
  const text = await r.text();
  if (!r.ok) throw new Error('userinfo ' + r.status + ' ' + text.slice(0, 200));

  const data = JSON.parse(text);
  const uid = data && data[c.idKey];
  if (uid === undefined || uid === null || uid === '') throw new Error('no uid');
  return String(uid);
}

/* ---------- 계정 찾기 / 만들기 ---------- */

/* 같은 사람이 다시 들어오면 같은 계정으로 붙고,
   처음이면 무작위 아이디로 새 계정을 만듭니다.
   아이디가 우연히 겹치면 몇 번 다시 뽑습니다. */
async function findOrCreateUser(provider, uid) {
  const q = 'eum_users?select=id,username&provider=eq.' + encodeURIComponent(provider) +
    '&provider_uid=eq.' + encodeURIComponent(uid) + '&limit=1';

  const found = await sb(q);
  if (found && found.length) return found[0];

  for (let i = 0; i < 5; i++) {
    const username = A.randomUsername();
    try {
      const rows = await sb('eum_users', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          username: username,
          provider: provider,
          provider_uid: uid
        })
      });
      if (rows && rows[0]) return rows[0];
    } catch (e) {
      // 아이디 중복(23505)이면 다시 뽑고, 그 사이 같은 사람이 만들어졌으면 그 계정을 씁니다.
      const again = await sb(q);
      if (again && again.length) return again[0];
      if (i === 4) throw e;
    }
  }
  throw new Error('username collision');
}

/* 콜백에서 화면으로 돌려보낼 때 씁니다. 외부 주소로는 절대 보내지 않습니다. */
function safeReturn(ret) {
  const v = String(ret || '');
  return /^[a-z0-9_-]{1,40}\.html$/.test(v) ? v : 'board.html';
}

module.exports = {
  PROVIDERS, conf, enabledProviders,
  baseUrl, redirectUri,
  packState, unpackState,
  setStateCookie, clearStateCookie, readStateCookie,
  makeVerifier, challengeOf,
  exchangeCode, fetchUid, findOrCreateUser, safeReturn
};
