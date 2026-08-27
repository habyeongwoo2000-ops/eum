/* E9-Bridge — 언어 공통 코드

   예전에는 5개 언어 문자열을 한 파일(172KB)에 담아, 베트남어 사용자도
   태국어·인도네시아어 번역까지 전부 내려받았습니다. 쓰는 것은 5분의 1인데
   나머지 5분의 4가 낭비였습니다.

   이제 이 파일(작음)만 먼저 받고, 고른 언어 파일 하나만 더 받습니다.
   기숙사에서 데이터를 아껴 쓰는 사람에게는 이 차이가 큽니다. */

/* 지금 파일이 있는 언어만 넣습니다. 새 언어 파일을 만들면 여기에 코드를 더하세요.
   목록에 없는 코드는 감지에서도 선택기에서도 제외됩니다. */
var EUM_LANGS = ['ko', 'en', 'vi', 'th', 'id', 'km', 'ne', 'my', 'si', 'uz'];

/* 고용허가제(E-9) 송출국에서 쓰는 말들. 화면에 보일 이름을 그 언어 그대로 적습니다.
   자기 언어를 찾는 사람은 "Khmer" 가 아니라 "ខ្មែរ" 를 찾습니다.
   tools/make-lang.mjs 로 파일을 만든 뒤 위 EUM_LANGS 에 코드를 추가하면 켜집니다. */
var EUM_LANG_NAMES = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  km: 'ខ្មែរ',          // 캄보디아
  ne: 'नेपाली',          // 네팔
  my: 'မြန်မာ',          // 미얀마
  si: 'සිංහල',          // 스리랑카
  uz: 'Oʻzbekcha',      // 우즈베키스탄
  mn: 'Монгол',         // 몽골
  bn: 'বাংলা',           // 방글라데시
  zh: '中文',            // 중국
  tl: 'Tagalog'         // 필리핀
};

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
  // 기기·OS 에 따라 다른 코드로 들어오는 경우를 함께 받습니다.
  //   in → id (인도네시아어 옛 코드)   my/bur → 미얀마   si/sin → 스리랑카
  var ALIAS = { 'in': 'id', 'bur': 'my', 'sin': 'si', 'khm': 'km', 'nep': 'ne', 'uzb': 'uz' };
  for (var a in ALIAS) {
    if (l.indexOf(a) === 0 && EUM_LANGS.indexOf(ALIAS[a]) !== -1) return ALIAS[a];
  }
  return 'en';
})();

/* 검수가 끝나지 않은 언어. 아직 번역되지 않은 문장은 영어로 채우고,
   화면 위에 "초안" 이라고 알려 줍니다. 빈칸으로 두는 것보다 낫고,
   다 된 것처럼 보이게 두는 것보다도 낫습니다. */
var EUM_DRAFT_LANGS = ['ne', 'my', 'si', 'uz'];

/* 언어를 나중에 바꿀 때 그 언어 파일을 그때 받아 옵니다.
   이미 받아 둔 언어면 곧바로 콜백을 부릅니다. */
function eumLoadLang(code, cb) {
  if (EUM_LANGS.indexOf(code) < 0) { cb(false); return; }
  if (I18N[code]) { cb(true); return; }

  /* 초안 언어는 영어를 먼저 받아 두어야 합니다. 빠진 문장을 영어로 메웁니다. */
  var needEn = EUM_DRAFT_LANGS.indexOf(code) !== -1 && !I18N.en;

  function grab(c, done) {
    var s = document.createElement('script');
    s.src = 'assets/i18n/' + c + '.js';
    s.onload = function () { done(!!I18N[c]); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }

  function after() {
    grab(code, function (ok) {
      if (ok && I18N.en && EUM_DRAFT_LANGS.indexOf(code) !== -1) {
        // 영어를 바탕에 깔고 그 위에 번역된 것만 덮어씁니다.
        var merged = {}, k;
        for (k in I18N.en) merged[k] = I18N.en[k];
        for (k in I18N[code]) merged[k] = I18N[code][k];
        I18N[code] = merged;
      }
      cb(ok);
    });
  }

  if (needEn) grab('en', function () { after(); });
  else after();
}
