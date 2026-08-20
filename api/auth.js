/* 회원가입 · 로그인 · 로그아웃 · 로그인 상태 확인

   GET  /api/auth                                   → { user: {username} | null }
   POST /api/auth  { action:'signup', username, password }
   POST /api/auth  { action:'login',  username, password }
   POST /api/auth  { action:'logout' }

   오류는 화면에 그대로 쓰지 않고 i18n 키(errIdTaken 등)로 돌려줍니다.
   그래야 사용자가 고른 언어로 안내할 수 있습니다. */

const { sb, readBody } = require('./_db');
const A = require('./_auth');
const O = require('./_oauth');

function fail(res, code, key) {
  return res.status(code).json({ ok: false, error: key });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const u = A.currentUser(req);
      // 어떤 소셜 버튼을 보일지는 서버가 정합니다. 키를 안 넣은 제공자의 버튼을
      // 화면에 띄워 두면 눌렀을 때만 실패해서, 사용자가 이유를 알 수 없습니다.
      return res.status(200).json({
        user: u ? { username: u.username, nickname: u.nickname } : null,
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

    const username = A.normalizeId(body.username);
    const password = String(body.password || '');

    if (action === 'signup') {
      const e1 = A.checkId(username); if (e1) return fail(res, 400, e1);
      const e2 = A.checkPw(password); if (e2) return fail(res, 400, e2);

      const dup = await sb('eum_users?select=id&username=eq.' +
        encodeURIComponent(username) + '&limit=1');
      if (dup && dup.length) return fail(res, 409, 'errIdTaken');

      const hash = await A.hashPassword(password);
      const rows = await sb('eum_users', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          username: username,
          nickname: username,        // 가입 직후에는 아이디를 그대로 이름으로 씁니다
          password_hash: hash,
          provider: 'password'
        })
      });

      const user = rows && rows[0];
      if (!user) return fail(res, 500, 'errNet');

      // 가입하면 바로 쓸 수 있게 그 자리에서 로그인시킵니다.
      A.setSession(res, user);
      return res.status(200).json({
        ok: true, user: { username: user.username, nickname: user.nickname || user.username }
      });
    }

    if (action === 'login') {
      // 아이디가 없을 때와 비밀번호가 틀렸을 때를 구분해 알려주지 않습니다.
      // 구분해 주면 어떤 아이디가 있는지 캐낼 수 있습니다.
      if (!username || !password) return fail(res, 400, 'errLoginFail');

      // 소셜로 만든 계정에는 비밀번호가 없습니다. 그런 행은 아예 찾지 않습니다.
      const rows = await sb('eum_users?select=id,username,nickname,password_hash' +
        '&provider=eq.password&username=eq.' +
        encodeURIComponent(username) + '&limit=1');
      const user = rows && rows[0];

      const ok = user ? await A.verifyPassword(password, user.password_hash) : false;
      if (!ok) return fail(res, 401, 'errLoginFail');

      A.setSession(res, user);
      return res.status(200).json({
        ok: true, user: { username: user.username, nickname: user.nickname || user.username }
      });
    }

    return fail(res, 400, 'errNet');
  } catch (e) {
    console.error('auth error', e && e.message);
    return fail(res, 500, 'errNet');
  }
};
