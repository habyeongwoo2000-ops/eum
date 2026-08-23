/* E9-Bridge — 언어 공통 코드

   예전에는 5개 언어 문자열을 한 파일(172KB)에 담아, 베트남어 사용자도
   태국어·인도네시아어 번역까지 전부 내려받았습니다. 쓰는 것은 5분의 1인데
   나머지 5분의 4가 낭비였습니다.

   이제 이 파일(작음)만 먼저 받고, 고른 언어 파일 하나만 더 받습니다.
   기숙사에서 데이터를 아껴 쓰는 사람에게는 이 차이가 큽니다. */

var EUM_LANGS = ['ko', 'en', 'vi', 'th', 'id'];

/* 언어 파일들이 여기에 자기 몫을 채워 넣습니다. */
var I18N = {};

/* ── 공용 상수 ──────────────────────────────────────────────
   언제 확인한 내용인지 한곳에서만 적어 둡니다. 여기만 고치면 5개 언어
   화면에 모두 반영됩니다. */
var CHECKED_ON = '2026-08-10';
/* 출국 정산 항목은 공식 자료로 따로 확인한 날짜입니다. */
var PAY_CHECKED = '2026-08-21';
/* 법률 자문 안내 항목을 공식 자료로 확인한 날짜입니다. */
var LEGAL_CHECKED = '2026-08-13';
var PAY_SRC = '외국인근로자의 고용 등에 관한 법률 제13조·제15조, 같은 법 시행령 제21조·제22조 · 근로자퇴직급여 보장법 제4조 · 근로기준법 제49조 · 국민연금법 제77조·제126조';

/* ── 어떤 언어로 시작할지 ───────────────────────────────────
   app.js 의 detect() 와 같은 순서로 봅니다: 주소의 ?lang= → 저장해 둔 값
   → 기기 언어. 여기서 미리 정해 두어야 그 언어 파일 하나만 받을 수 있습니다. */
var EUM_LANG = (function () {
  var l = null;
  try {
    l = new URLSearchParams(location.search).get('lang') || localStorage.getItem('eum.lang');
  } catch (e) {}
  if (!l) l = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  l = String(l || '').toLowerCase();

  for (var i = 0; i < EUM_LANGS.length; i++) {
    if (l.indexOf(EUM_LANGS[i]) === 0) return EUM_LANGS[i];
  }
  // 인도네시아어는 기기에 따라 옛 코드 'in' 으로 들어옵니다.
  if (l.indexOf('in') === 0) return 'id';
  return 'en';
})();

/* 언어를 나중에 바꿀 때 그 언어 파일을 그때 받아 옵니다.
   이미 받아 둔 언어면 곧바로 콜백을 부릅니다. */
function eumLoadLang(code, cb) {
  if (EUM_LANGS.indexOf(code) < 0) { cb(false); return; }
  if (I18N[code]) { cb(true); return; }

  var s = document.createElement('script');
  s.src = 'assets/i18n/' + code + '.js';
  s.onload = function () { cb(!!I18N[code]); };
  s.onerror = function () { cb(false); };
  document.head.appendChild(s);
}
