/* 회원가입 · 로그인 · 로그아웃 · 로그인 상태 확인 · 언어 저장

   GET  /api/auth                                   → { user: {username} | null }
   POST /api/auth  { action:'signup', username, password, lang? }
   POST /api/auth  { action:'login',  username, password }
   POST /api/auth  { action:'logout' }
   POST /api/auth  { action:'lang',   lang }         → 로그인한 사람만. 계정에 언어 저장.

   오류는 화면에 그대로 쓰지 않고 i18n 키(errIdTaken 등)로 돌려줍니다.
   그래야 사용자가 고른 언어로 안내할 수 있습니다. */

const { sb, readBody } = require('./_db');
const A = require('./_auth');
const O = require('./_oauth');

function fail(res, code, key) {
  return res.status(code).json({ ok: false, error: key });
}

function toUser(u) {
  return {
    username: u.username,
    nickname: u.nickname || u.username,
    isAdmin: !!u.is_admin,
    lang: u.lang || null
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const u = A.currentUser(req);
      // 어떤 소셜 버튼을 보일지는 서버가 정합니다. 키를 안 넣은 제공자의 버튼을
      // 화면에 띄워 두면 눌렀을 때만 실패해서, 사용자가 이유를 알 수 없습니다.
      return res.status(200).json({
        user: u ? { username: u.username, nickname: u.nickname, isAdmin: u.isAdmin, lang: u.lang } : null,
        methods: O.enabledProviders()
      });
    }

    if (req.method !== 'POST') return fail(res, 405, 'errNet');

    const body = readBody(req);
    const action = String(body.action || '');

    if (action === 'logout') {
      A.clearSession(res);
      return res.status(200).json({ ok: true });
    }

    /* ---------- 언어 저장 ---------- */
    /* 로그인한 사람이 언어를 고르면(자동 감지 포함) 계정에도 저장해 둡니다.
       다음에 다른 기기로 들어와도 이 언어로 화면이 맞춰집니다. */
    if (action === 'lang') {
      const me = A.currentUser(req);
      if (!me) return fail(res, 401, 'errNeedLogin');

      const lang = A.normalizeLang(String(body.lang || ''));
      if (!lang) return fail(res, 400, 'errNet');

      const rows = await sb('eum_users?id=eq.' + encodeURIComponent(me.uid), {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ lang: lang })
      });
      const u = rows && rows[0];
      if (!u) return fail(res, 500, 'errNet');

      // 쿠키 안에도 언어가 들어 있어서, 다시 발급해야 다음 요청부터 바로 반영됩니다.
      A.setSession(res, u);
      return res.status(200).json({ ok: true, lang: u.lang || null });
    }

    const username = A.normalizeId(body.username);
    const password = String(body.password || '');

    if (action === 'signup') {
      const e1 = A.checkId(username); if (e1) return fail(res, 400, e1);
      const e2 = A.checkPw(password); if (e2) return fail(res, 400, e2);

      const dup = await sb('eum_users?select=id&username=eq.' +
        encodeURIComponent(username) + '&limit=1');
      if (dup && dup.length) return fail(res, 409, 'errIdTaken');

      // 가입하는 순간 이 기기가 쓰는 언어를 함께 저장해 둡니다(선택 사항).
      // 다음에 다른 기기로 로그인해도 처음부터 이 언어로 보입니다.
      const lang = A.normalizeLang(String(body.lang || ''));

      const hash = await A.hashPassword(password);
      const rows = await sb('eum_users', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          username: username,
          nickname: username,        // 가입 직후에는 아이디를 그대로 이름으로 씁니다
          password_hash: hash,
          provider: 'password',
          lang: lang
        })
      });

      const user = rows && rows[0];
      if (!user) return fail(res, 500, 'errNet');

      // 가입하면 바로 쓸 수 있게 그 자리에서 로그인시킵니다.
      A.setSession(res, user);
      return res.status(200).json({ ok: true, user: toUser(user) });
    }

    if (action === 'login') {
      // 아이디가 없을 때와 비밀번호가 틀렸을 때를 구분해 알려주지 않습니다.
      // 구분해 주면 어떤 아이디가 있는지 캐낼 수 있습니다.
      if (!username || !password) return fail(res, 400, 'errLoginFail');

      // 소셜로 만든 계정에는 비밀번호가 없습니다. 그런 행은 아예 찾지 않습니다.
      const rows = await sb('eum_users?select=id,username,nickname,password_hash,is_admin,lang' +
        '&provider=eq.password&username=eq.' +
        encodeURIComponent(username) + '&limit=1');
      const user = rows && rows[0];

      const ok = user ? await A.verifyPassword(password, user.password_hash) : false;
      if (!ok) return fail(res, 401, 'errLoginFail');

      A.setSession(res, user);
      return res.status(200).json({ ok: true, user: toUser(user) });
    }

    return fail(res, 400, 'errNet');
  } catch (e) {
    console.error('auth error', e && e.message);
    return fail(res, 500, 'errNet');
  }
};
