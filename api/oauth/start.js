/* 소셜 로그인 시작 — /api/oauth/start?p=google&ret=board.html

   화면의 버튼은 그냥 이 주소로 가는 링크입니다. 자바스크립트가 필요 없습니다.
   여기서 임시 쿠키를 심고 제공자 로그인 화면으로 넘깁니다. */

const O = require('../_oauth');

module.exports = function handler(req, res) {
  try {
    const name = String((req.query && req.query.p) || '');
    const ret = O.safeReturn(req.query && req.query.ret);
    const c = O.conf(name);

    // 키를 안 넣었으면 조용히 실패하지 않고 이유를 화면에 알립니다.
    if (!c) {
      res.writeHead(302, { location: '/' + ret.replace('board.html', 'login.html') + '?err=oauthOff' });
      return res.end();
    }

    const nonce = O.makeVerifier();
    const verifier = O.makeVerifier();
    const state = O.packState({
      p: name,
      n: nonce,
      v: verifier,
      r: ret,
      exp: Math.floor(Date.now() / 1000) + 600
    });

    O.setStateCookie(res, state);

    const q = new URLSearchParams({
      response_type: 'code',
      client_id: c.clientId,
      redirect_uri: O.redirectUri(req, name),
      state: nonce
    });
    if (c.scope) q.set('scope', c.scope);
    if (c.usePkce) {
      q.set('code_challenge', O.challengeOf(verifier));
      q.set('code_challenge_method', 'S256');
    }
    // 구글은 계정 선택 화면을 매번 띄우게 합니다. 공용 기기에서 남의 계정으로
    // 자동 로그인되는 일을 막기 위해서입니다.
    if (name === 'google') q.set('prompt', 'select_account');

    res.writeHead(302, { location: c.authUrl + '?' + q.toString() });
    return res.end();
  } catch (e) {
    console.error('oauth start', e && e.message);
    res.writeHead(302, { location: '/login.html?err=oauth' });
    return res.end();
  }
};
