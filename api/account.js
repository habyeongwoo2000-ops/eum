/* 마이페이지 — 내 정보 보기 / 닉네임 바꾸기 / 비밀번호 바꾸기

   GET  /api/account                                   → { username, nickname, provider, joined }
   POST /api/account { action:'nickname', nickname }
   POST /api/account { action:'password', current, next }

   지켜야 하는 것 세 가지

   1) 로그인 아이디는 바꾸지 않습니다.
      바꾸게 하면 다음에 들어올 때 본인이 못 들어옵니다. 화면에 보이는
      이름(nickname)만 바꿉니다.

   2) 비밀번호를 바꿀 때는 지금 비밀번호를 반드시 확인합니다.
      남이 자리를 비운 사이 기기를 만져 비밀번호만 바꿔 계정을 빼앗는 일을
      막습니다. 소셜로 들어온 계정에는 비밀번호가 없어서 이 기능이 없습니다.

   3) 닉네임을 바꾸면 그 사람이 쓴 게시글의 표시 이름도 함께 바꿉니다.
      안 바꾸면 예전 글에 옛 이름이 남아, 이름을 바꾼 의미가 없어집니다. */

const { sb, readBody } = require('./_db');
const A = require('./_auth');

function fail(res, code, key) {
  return res.status(code).json({ ok: false, error: key });
}

// 고용허가제(E-9) 송출 16개국 + 기타. docs/profile.sql 의 체크 제약과 맞춰 둡니다.
const NAT_CODES = ['PH', 'MN', 'LK', 'VN', 'TH', 'ID', 'UZ', 'PK', 'KH', 'CN', 'BD', 'NP', 'MM', 'KG', 'TL', 'LA', 'other'];
const GENDER_CODES = ['M', 'F'];

module.exports = async function handler(req, res) {
  try {
    const me = A.currentUser(req);
    if (!me) return fail(res, 401, 'errNeedLogin');

    /* ---------- 내 정보 ---------- */
    if (req.method === 'GET') {
      const rows = await sb('eum_users?select=username,nickname,provider,created_at,birthdate,nationality,gender&id=eq.' +
        encodeURIComponent(me.uid) + '&limit=1');
      const u = rows && rows[0];
      if (!u) return fail(res, 404, 'errNet');

      return res.status(200).json({
        username: u.username,
        nickname: u.nickname || u.username,
        provider: u.provider || 'password',
        joined: (u.created_at || '').slice(0, 10),
        birthdate: u.birthdate || '',
        nationality: u.nationality || '',
        gender: u.gender || ''
      });
    }

    if (req.method !== 'POST') return fail(res, 405, 'errNet');

    const body = readBody(req);
    const action = String(body.action || '');

    /* ---------- 닉네임 바꾸기 ---------- */
    if (action === 'nickname') {
      const nickname = A.normalizeNick(body.nickname);
      const bad = A.checkNick(nickname);
      if (bad) return fail(res, 400, bad);

      // 같은 이름을 쓰는 사람이 이미 있는지 봅니다. 대소문자만 다른 것도 걸러냅니다.
      const dup = await sb('eum_users?select=id&nickname=ilike.' +
        encodeURIComponent(nickname) + '&limit=1');
      if (dup && dup.length && dup[0].id !== me.uid) {
        return fail(res, 409, 'errNickTaken');
      }

      const rows = await sb('eum_users?id=eq.' + encodeURIComponent(me.uid), {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ nickname: nickname })
      });
      const user = rows && rows[0];
      if (!user) return fail(res, 500, 'errNet');

      // 예전에 쓴 글에 옛 이름이 남지 않게 함께 고칩니다.
      // 여기서 실패해도 닉네임 변경 자체는 이미 끝났으므로 화면을 막지 않습니다.
      try {
        await sb('eum_posts?user_id=eq.' + encodeURIComponent(me.uid), {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({ username: nickname })
        });
      } catch (e) {
        console.warn('post rename failed', e && e.message);
      }

      // 쿠키 안에도 이름이 들어 있어서 다시 발급해야 머리말이 바로 바뀝니다.
      A.setSession(res, user);
      return res.status(200).json({ ok: true, nickname: nickname });
    }

    /* ---------- 비밀번호 바꾸기 ---------- */
    if (action === 'password') {
      const current = String(body.current || '');
      const next = String(body.next || '');

      const rows = await sb('eum_users?select=id,username,nickname,provider,password_hash&id=eq.' +
        encodeURIComponent(me.uid) + '&limit=1');
      const u = rows && rows[0];
      if (!u) return fail(res, 404, 'errNet');

      // 소셜 계정에는 바꿀 비밀번호가 없습니다.
      if (u.provider !== 'password' || !u.password_hash) {
        return fail(res, 400, 'errPwSocial');
      }

      const ok = await A.verifyPassword(current, u.password_hash);
      if (!ok) return fail(res, 401, 'errPwWrong');

      const bad = A.checkPw(next);
      if (bad) return fail(res, 400, bad);
      if (current === next) return fail(res, 400, 'errPwSame');

      const hash = await A.hashPassword(next);
      await sb('eum_users?id=eq.' + encodeURIComponent(me.uid), {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ password_hash: hash })
      });

      // 쿠키를 새로 발급해 유효기간을 다시 채웁니다.
      A.setSession(res, u);
      return res.status(200).json({ ok: true });
    }

    /* ---------- 프로필(생년월일 · 국적 · 성별) 바꾸기 ---------- */
    if (action === 'profile') {
      const birthdateRaw = String(body.birthdate || '').trim();
      const nationality = String(body.nationality || '').trim();
      const gender = String(body.gender || '').trim();

      let birthdate = null;
      if (birthdateRaw) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdateRaw)) return fail(res, 400, 'errBirthRule');
        const d = new Date(birthdateRaw + 'T00:00:00Z');
        if (Number.isNaN(d.getTime())) return fail(res, 400, 'errBirthRule');
        if (d.getTime() > Date.now()) return fail(res, 400, 'errBirthFuture');
        if (d.getUTCFullYear() < 1930) return fail(res, 400, 'errBirthRule');
        birthdate = birthdateRaw;
      }

      if (nationality && NAT_CODES.indexOf(nationality) < 0) return fail(res, 400, 'errNationRule');
      if (gender && GENDER_CODES.indexOf(gender) < 0) return fail(res, 400, 'errGenderRule');

      const rows = await sb('eum_users?id=eq.' + encodeURIComponent(me.uid), {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          birthdate: birthdate,
          nationality: nationality || null,
          gender: gender || null
        })
      });
      const u = rows && rows[0];
      if (!u) return fail(res, 500, 'errNet');

      return res.status(200).json({
        ok: true,
        birthdate: u.birthdate || '',
        nationality: u.nationality || '',
        gender: u.gender || ''
      });
    }

    return fail(res, 400, 'errNet');
  } catch (e) {
    console.error('account error', e && e.message);
    return fail(res, 500, 'errNet');
  }
};
