/* 구글 로그인 콜백 — 구글 클라우드 콘솔의 "승인된 리디렉션 URI" 에
   https://<도메인>/api/oauth/google 를 그대로 등록하세요. */
const callback = require('./_callback');
module.exports = function (req, res) { return callback('google', req, res); };
