/* 관리자 계정 만들기/해제 — 로그인 계정과는 별개로, 비밀 키 하나로만 지킵니다.

   POST /api/admin { action:'promote', username, key }  → 그 계정을 관리자로
   POST /api/admin { action:'demote',  username, key }   → 관리자 해제

   환경변수
     ADMIN_SETUP_KEY   길고 무작위한 문자열. Vercel 환경변수에 직접 넣고
                       아무에게도 보여주지 마세요. 이 키를 아는 사람은 누구나
                       관리자를 만들 수 있습니다.

   이 키가 설정되어 있지 않으면 기능 자체가 꺼집니다(항상 실패).
   로그인 여부와 무관하게, 오직 이 키로만 지킵니다 — 계정을 새로 만들
   필요 없이 이미 있는 아이디를 관리자로 "승격"시키는 방식입니다. */

const { sb, readBody } = require('./_db');
const A = require('./_auth');

function fail(res, code, key) {
  return res.status(code).json({ ok: false, error: key });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return fail(res, 405, 'errNet');

    const setupKey = process.env.ADMIN_SETUP_KEY;
    if (!setupKey || setupKey.length < 12) return fail(res, 503, 'errAdminOff');

    const body = readBody(req);
    const action = String(body.action || '');
    const key = String(body.key || '');

    // 시간차 공격을 막기 위해 길이를 맞춰 비교합니다.
    const want = Buffer.from(setupKey);
    const got = Buffer.from(key);
    const okKey = want.length === got.length && require('crypto').timingSafeEqual(want, got);
    if (!okKey) return fail(res, 403, 'errAdminKey');

    const username = A.normalizeId(body.username);
    if (!username) return fail(res, 400, 'errAdminUser');

    if (action !== 'promote' && action !== 'demote') return fail(res, 400, 'errNet');
    const isAdmin = action === 'promote';

    const rows = await sb('eum_users?username=eq.' + encodeURIComponent(username), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ is_admin: isAdmin })
    });
    const user = rows && rows[0];
    if (!user) return fail(res, 404, 'errAdminUser');

    return res.status(200).json({ ok: true, username: user.username, isAdmin: !!user.is_admin });
  } catch (e) {
    console.error('admin error', e && e.message);
    return fail(res, 500, 'errNet');
  }
};
