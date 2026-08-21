/* 소셜 로그인 콜백 공통 처리.
   google.js 와 kakao.js 가 제공자 이름만 바꿔 이 함수를 부릅니다.

   실패하면 이유를 자세히 알려 주지 않고 로그인 화면으로 돌려보냅니다.
   어디서 막혔는지 알려 주면 남의 계정을 캐는 데 쓸 수 있습니다.
   서버 로그에는 남기므로 개발할 때는 Vercel 로그를 보세요. */

const O = require('../_oauth');
const A = require('../_auth');

function bail(res, ret, err) {
  O.clearStateCookie(res);
  res.writeHead(302, { location: '/login.html?err=' + (err || 'oauth') });
  return res.end();
}

module.exports = async function callback(name, req, res) {
  let ret = 'board.html';
  try {
    const c = O.conf(name);
    if (!c) return bail(res, ret, 'oauthOff');

    // 사용자가 제공자 화면에서 "취소"를 누른 경우입니다. 오류가 아닙니다.
    if (req.query && req.query.error) {
      O.clearStateCookie(res);
      res.writeHead(302, { location: '/login.html' });
      return res.end();
    }

    const code = String((req.query && req.query.code) || '');
    const stateParam = String((req.query && req.query.state) || '');
    if (!code || !stateParam) return bail(res, ret);

    const saved = O.unpackState(O.readStateCookie(req));
    if (!saved) return bail(res, ret);
    if (saved.p !== name) return bail(res, ret);

    ret = O.safeReturn(saved.r);

    // 쿠키 안의 값과 주소로 돌아온 값이 같아야 우리가 시작한 로그인입니다.
    const want = Buffer.from(String(saved.n));
    const got = Buffer.from(stateParam);
    if (want.length !== got.length) return bail(res, ret);
    if (!require('crypto').timingSafeEqual(want, got)) return bail(res, ret);

    const token = await O.exchangeCode(c, req, code, saved.v);
    const uid = await O.fetchUid(c, token);
    const user = await O.findOrCreateUser(name, uid);

    O.clearStateCookie(res);
    A.setSession(res, user);

    res.writeHead(302, { location: '/' + ret });
    return res.end();
  } catch (e) {
    console.error('oauth callback ' + name, e && e.message);
    return bail(res, ret);
  }
};
