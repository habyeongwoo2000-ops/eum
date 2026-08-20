/* 카카오 로그인 콜백 — 카카오 개발자센터 → 카카오 로그인 → Redirect URI 에
   https://<도메인>/api/oauth/kakao 를 그대로 등록하세요. */
const callback = require('./_callback');
module.exports = function (req, res) { return callback('kakao', req, res); };
