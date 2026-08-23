/* E9-Bridge — 화면 동작
   서버 없이 브라우저에서만 돕니다. 입력한 값은 이 기기의 localStorage 에만 남습니다. */

(function () {
  'use strict';

  var STORE = 'eum.';
  /* core.js 가 미리 정한 언어입니다. 그 언어 파일 하나만 받아 둔 상태이므로
     여기서 곧바로 씁니다. 다른 언어로 바꾸면 그때 그 파일을 받아 옵니다. */
  var lang = (typeof EUM_LANG === 'string' && I18N[EUM_LANG]) ? EUM_LANG : 'ko';
  var T = I18N[lang] || I18N.ko || {};

  /* ---------- 작은 도구들 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function save(k, v) { try { localStorage.setItem(STORE + k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(STORE + k); } catch (e) { return null; } }
  function drop(k) { try { localStorage.removeItem(STORE + k); } catch (e) {} }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- 언어 ---------- */
  /* 언어를 고르는 순서
     1) ?lang=vi 같은 주소 지정 — 상담사나 지인이 링크로 언어를 정해 보낼 때
     2) 이 기기에 저장된 선택
     3) 기기 언어 목록 (전체 태그 → 기본 코드 → 옛 코드)
     4) 셋 다 없으면 영어로 보여주고, 아직 지원하지 않는 언어라고 알립니다

     화면 문자열은 전부 i18n.js 에 박아 둡니다. 실시간 번역을 부르지 않으므로
     언어를 바꿔도 추가 비용이 없고 오프라인에서도 동작합니다.
     언어를 늘리려면 i18n.js·data.js·index.html 세 곳을 함께 고쳐야 합니다
     (README 4장 "언어 추가"). */

  // 브라우저가 옛 코드나 세 글자 코드를 보내는 경우를 흡수합니다.
  var LANG_ALIAS = { in: 'id', ind: 'id', vie: 'vi', tha: 'th', kor: 'ko', eng: 'en' };

  /* 지원 목록에 있는 코드만 통과시킵니다. ?lang=constructor 같은 입력도 여기서 막힙니다.
     I18N 은 아직 안 받아 온 언어가 비어 있으므로 목록으로 판단합니다. */
  function isLang(code) {
    return typeof code === 'string' && EUM_LANGS.indexOf(code) >= 0;
  }

  function pickLang(tag) {
    var t = String(tag || '').toLowerCase().replace(/_/g, '-').trim();
    if (!t) return null;
    if (isLang(t)) return t;                                // 나중에 zh-tw 처럼 지역까지 넣을 때
    var base = t.split('-')[0];
    if (isLang(base)) return base;                          // vi-VN → vi
    if (isLang(LANG_ALIAS[base])) return LANG_ALIAS[base];  // in → id
    return null;
  }

  function detect() {
    var fromUrl = null;
    try { fromUrl = pickLang(new URLSearchParams(location.search).get('lang')); } catch (e) {}
    if (fromUrl) return { code: fromUrl, auto: false, matched: true, source: 'url' };

    var stored = pickLang(load('lang'));
    if (stored) return { code: stored, auto: false, matched: true, source: 'stored' };

    var list = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var hit = pickLang(list[i]);
      if (hit) return { code: hit, auto: true, matched: true, source: 'device' };
    }

    return { code: 'en', auto: true, matched: false, source: 'fallback' };
  }

  function applyLang(code) {
    var want = isLang(code) ? code : 'en';

    /* 그 언어 파일을 아직 안 받았으면 받아 온 뒤 다시 부릅니다.
       못 받으면(전파 지연·오프라인) 지금 언어를 그대로 두어, 화면이
       빈 채로 남지 않게 합니다. */
    if (!I18N[want]) {
      eumLoadLang(want, function (ok) { if (ok) applyLang(want); });
      return;
    }

    lang = want;
    T = I18N[lang];
    document.documentElement.lang = lang;
    /* 탭 제목: "사유 자가진단 · E9-Bridge — 사업장 변경 안내" 처럼 페이지 이름을 앞에 붙입니다.
       페이지 이름 키는 <body data-page-title="ckTitle"> 로 지정합니다 (홈은 없음). */
    if (T.docTitle) {
      var pk = document.body.getAttribute('data-page-title');
      document.title = (pk && T[pk]) ? (T[pk] + ' · ' + T.docTitle) : T.docTitle;
    }
    $$('[data-i18n]').forEach(function (n) {
      var v = T[n.getAttribute('data-i18n')];
      if (typeof v === 'string') n.textContent = v;
    });
    $$('[data-i18n-ph]').forEach(function (n) {
      var v = T[n.getAttribute('data-i18n-ph')];
      if (typeof v === 'string') n.placeholder = v;
    });
    $$('[data-i18n-aria]').forEach(function (n) {
      var v = T[n.getAttribute('data-i18n-aria')];
      if (typeof v === 'string') n.setAttribute('aria-label', v);
    });
    var sel = $('#langSelect');
    if (sel) sel.value = lang;

    /* 페이지마다 들어 있는 기능이 다릅니다. 각 함수가 자기 요소가 없으면
       조용히 넘어가므로 여기서는 그냥 다 부릅니다. */
    renderNotices();
    renderInterviews();
    renderChips();
    renderPayList();
    renderBoard();
    boardMsg(boardMsgKey, boardMsgKind); // 안내 문구도 새 언어로 다시 씁니다
    authMsg(authMsgKey, authMsgKind);
    paintAuth();
    paintPager();
    syncStick();                         // 라벨 길이가 바뀌면 헤더 높이도 바뀝니다
    if (shown('#payResult')) calcPay();
    if (shown('#insResult')) calcIns();
    if (shown('#eligResult')) calcElig();
    if (shown('#ddayResult')) calcDday();
    if (shown('#quizResult')) showQuizResult();
    clearThread();

    /* 첫 화면 깜빡임 가리개를 걷습니다. HTML 에는 한국어가 박혀 있어서
       다른 언어 사용자는 이 시점 전까지 한국어를 보게 됩니다. (head 의 부트 코드 참고) */
    document.documentElement.removeAttribute('data-lang-pending');
  }

  function shown(sel) {
    var n = $(sel);
    return !!n && !n.hidden;
  }

  /* ---------- 날짜 ---------- */
  function addMonths(d, n) {
    var t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    var last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(d.getDate(), last));
    return t;
  }
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function today() { return midnight(new Date()); }
  function diffDays(a, b) { return Math.round((midnight(a) - midnight(b)) / 86400000); }
  function fmt(d) {
    var m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /* 화면에 보여줄 마감일. 숫자는 ISO 그대로 둡니다 — 근로자가 대조할 고용센터
     서류와 EPS 누리집이 같은 표기를 쓰기 때문입니다. 요일만 사용자 언어로 붙입니다.
     고용센터는 주말에 닫으므로 마감일이 무슨 요일인지가 실제 행동을 바꿉니다. */
  var weekdayFmt = {};

  function weekdayOf(d) {
    if (!(lang in weekdayFmt)) {
      /* 태국어는 기본 달력이 불교력이라 2026년이 2569년으로 나옵니다.
         서류의 연도와 어긋나면 안 되므로 그레고리력을 못박습니다.
         (요일 자체는 달력과 무관하지만 표기 규칙을 한곳에 모아 둡니다.) */
      var loc = lang === 'th' ? 'th-TH-u-ca-gregory' : lang;
      try {
        weekdayFmt[lang] = new Intl.DateTimeFormat(loc, { weekday: 'long' });
      } catch (e) {
        weekdayFmt[lang] = null; // Intl 이 없거나 언어를 모르면 요일 없이 갑니다
      }
    }
    if (!weekdayFmt[lang]) return '';
    try { return weekdayFmt[lang].format(d); } catch (e) { return ''; }
  }

  function fmtDay(d) {
    var w = weekdayOf(d);
    return w ? fmt(d) + ' (' + w + ')' : fmt(d);
  }

  /* ---------- 기한 계산 ---------- */
  function paintCard(card, numEl, days) {
    card.classList.remove('is-ok', 'is-warn', 'is-stop');
    var unit = $('.unit', card);
    if (days < 0) {
      card.classList.add('is-stop'); numEl.textContent = Math.abs(days); unit.textContent = T.daysOver;
    } else if (days === 0) {
      card.classList.add('is-stop'); numEl.textContent = '0'; unit.textContent = T.dueToday;
    } else {
      card.classList.add(days <= 7 ? 'is-warn' : 'is-ok');
      numEl.textContent = days; unit.textContent = T.daysUnit;
    }
  }

  function calcDday() {
    var leaveIn = $('#leaveDate');
    if (!leaveIn) return;              // 이 페이지에 기한 계산기가 없습니다
    var leaveV = leaveIn.value;
    if (!leaveV) return;
    var leave = midnight(new Date(leaveV + 'T00:00:00'));
    var now = today();
    var msg = $('#ddayMsg');

    if (leave > now) {
      $('#ddayResult').hidden = false;
      $('.dday-cards').hidden = true;
      $('#liveTimeline').hidden = true;
      msg.className = 'callout is-stop';
      msg.textContent = T.dlBadDate;
      return;
    }
    $('.dday-cards').hidden = false;
    $('#liveTimeline').hidden = false;

    var applyV = $('#applyDate').value;
    var applyDue = addMonths(leave, 1);
    var applied = applyV ? midnight(new Date(applyV + 'T00:00:00')) : null;
    var jobDue = addMonths(applied || applyDue, 3);

    var applyDays = diffDays(applyDue, now);
    var jobDays = diffDays(jobDue, now);

    save('leave', leaveV);
    if (applyV) save('apply', applyV); else drop('apply');

    $('#ddayResult').hidden = false;
    paintCard($('#cardApply'), $('#applyNum'), applyDays);
    paintCard($('#cardJob'), $('#jobNum'), jobDays);
    $('#applyDateOut').textContent = fmtDay(applyDue);
    $('#jobDateOut').textContent = fmtDay(jobDue);
    // 아래 타임라인 라벨은 자리가 좁아 요일 없이 날짜만 둡니다.
    $('#lbLeave').textContent = fmt(leave);
    $('#lbApply').textContent = fmt(applied || applyDue);
    $('#lbJob').textContent = fmt(jobDue);

    var span = diffDays(jobDue, leave) || 1;
    var pos = Math.max(0, Math.min(100, (diffDays(now, leave) / span) * 100));
    $('#liveFill').style.width = pos + '%';
    $('#livePin').style.left = pos + '%';

    var lines = [];
    if (applyDays < 0) { msg.className = 'callout is-stop'; lines.push(T.msgOver); }
    else if (applyDays <= 7) { msg.className = 'callout is-warn'; lines.push(T.msgWarn); }
    else { msg.className = 'callout'; lines.push(T.msgOk); }

    if (jobDays < 0) lines.push(T.msgJobOver);
    else if (jobDays <= 14) lines.push(T.msgJobWarn);
    if (!applyV) lines.push(T.msgEstimate);
    msg.textContent = lines.join(' ');
  }

  /* ---------- 자가진단 ---------- */
  var lastQuiz = null;

  function showQuizResult() {
    if (!lastQuiz) return;
    var q1 = lastQuiz.q1, q2 = lastQuiz.q2, q3 = lastQuiz.q3;
    var box = $('#quizResult');
    var employerFault = q1 !== 'own';
    var overLimit = q3 === '3';

    box.hidden = false;
    box.classList.remove('is-warn', 'is-stop');

    var tag, title, body;
    if (overLimit) {
      box.classList.add('is-stop');
      tag = T.resCountTag; title = T.resCountTitle; body = T.resCountBody;
    } else if (employerFault) {
      tag = T.resEmpTag; title = T.resEmpTitle; body = T.resEmpBody;
    } else {
      box.classList.add('is-warn');
      tag = T.resOwnTag; title = T.resOwnTitle; body = T.resOwnBody;
    }

    var ev = q2 === 'yes' ? T.evYes : (q2 === 'some' ? T.evSome : T.evNo);
    var count = T.countLine.replace('{n}', q3 === '3' ? '3+' : q3);

    $('#resultTag').textContent = tag;
    $('#resultTitle').textContent = title;
    $('#resultBody').textContent = body + ' ' + ev + ' ' + count;

    var ul = $('#resultDocs');
    ul.innerHTML = '';
    T.docs.forEach(function (d) { ul.appendChild(el('li', null, d)); });
    $('#resultSrc').textContent = T.askSourceLabel + ': 외국인근로자의 고용 등에 관한 법률 제25조 · ' +
      T.ntCheckedLabel + ' ' + CHECKED_ON;
  }

  /* ---------- 출국 정산 ---------- */
  function renderPayList() {
    var box = $('#payList');
    if (!box) return;
    box.innerHTML = '';
    (T.pyItems || []).forEach(function (it) {
      var card = el('div', 'pay-item');
      var h = el('h4');
      h.appendChild(el('span', 'pay-check', '✓'));
      h.appendChild(el('span', null, it.t));
      card.appendChild(h);
      card.appendChild(el('p', null, it.w));
      card.appendChild(el('p', 'pay-where', it.r));
      box.appendChild(card);
    });
    $('#paySrc').textContent = T.askSourceLabel + ': ' + PAY_SRC + ' · ' + T.ntCheckedLabel + ' ' + PAY_CHECKED;
  }

  function calcPay() {
    var exitIn = $('#exitDate');
    if (!exitIn) return;
    var v = exitIn.value;
    if (!v) return;
    var exit = midnight(new Date(v + 'T00:00:00'));
    var now = today();

    var reportDue = addMonths(exit, -1);
    var claimDue = new Date(exit.getFullYear(), exit.getMonth(), exit.getDate() - 7);
    var reportDays = diffDays(reportDue, now);
    var claimDays = diffDays(claimDue, now);

    save('exit', v);
    $('#payResult').hidden = false;
    paintCard($('#cardReport'), $('#reportNum'), reportDays);
    paintCard($('#cardClaim'), $('#claimNum'), claimDays);
    $('#reportDateOut').textContent = fmtDay(reportDue);
    $('#claimDateOut').textContent = fmtDay(claimDue);

    var msg = $('#payMsg');
    if (claimDays < 0) { msg.className = 'callout is-stop'; msg.textContent = T.pyMsgOver; }
    else if (claimDays <= 7 || reportDays < 0) { msg.className = 'callout is-warn'; msg.textContent = T.pyMsgWarn; }
    else { msg.className = 'callout'; msg.textContent = T.pyMsgOk; }
  }

  /* ---------- 출국만기보험 어림 계산 ----------
     회사는 근로계약 효력 발생일부터 15일 안에 출국만기보험에 들어야 하고,
     매달 통상임금의 8.3%(1/12)를 냅니다. 한 사업장에서 1년 이상 일한 뒤
     출국하거나 체류자격이 바뀌면 본인이 청구할 수 있습니다.

     법정 퇴직금(계속근로 1년에 30일분 평균임금)보다 보험금이 적으면
     그 차액은 회사가 따로 줘야 합니다. 그래서 두 값을 나란히 보여 줍니다.

     여기서 나오는 값은 어디까지나 어림값입니다. 실제로는 회사가 실제 낸
     보험료와 이자로 정해지고, 통상임금과 평균임금도 서로 다릅니다.
     화면에도 그 점을 크게 적어 둡니다. */
  var INS_RATE = 1 / 12;          // 통상임금의 8.3%
  var INS_MIN_DAYS = 365;         // 1년 이상

  function wonFmt(n) {
    var v = Math.round(n);
    try { return v.toLocaleString('ko-KR') + (T.wonUnit || '원'); }
    catch (e) { return String(v) + (T.wonUnit || '원'); }
  }

  /* ---------- 출국 정산 적격 판정 ---------- */
  /* 계속근로기간을 달 수로 셉니다. 「근로자퇴직급여 보장법」의 1년은 달을 기준으로
     보므로 날 수가 아니라 달 수로 비교합니다. 위 calcIns 는 보험료 어림을 위해
     날 수(INS_MIN_DAYS)를 쓰지만, 자격 판정은 달 기준이 맞습니다.
     예) 2025-03-10 입사 → 2026-03-09 는 11개월(1년 미만), 03-10 은 12개월(1년 이상). */
  function monthsWorked(from, to) {
    var m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    if (to.getDate() < from.getDate()) m -= 1;
    return m;
  }

  function radioVal(name) {
    var n = document.querySelector('input[name="' + name + '"]:checked');
    return n ? n.value : '';
  }

  /* 판정 한 줄을 카드로 그립니다. kind 는 ok / warn / no.
     상태는 색만으로 말하지 않습니다 — 레일 + 배지 + 글자를 함께 씁니다. */
  function verdictCard(name, kind, body, where) {
    var card = el('div', 'pay-item is-' + (kind === 'no' ? 'stop' : kind));
    var h = el('h4');
    h.appendChild(el('span', 'pay-check', kind === 'ok' ? '\u2713' : (kind === 'warn' ? '!' : '\u00d7')));
    h.appendChild(el('span', null, name));
    card.appendChild(h);
    var E = T.pyElig;
    card.appendChild(el('p', 'pay-verdict',
      kind === 'ok' ? E.vOk : (kind === 'warn' ? E.vWarn : E.vNo)));
    card.appendChild(el('p', null, body));
    if (where) card.appendChild(el('p', 'pay-where', where));
    return card;
  }

  /* 들어온 날 · 마지막 근무일은 위 보험 계산기와 같은 뜻이라 값을 서로 맞춰 둡니다.
     사용자가 같은 날짜를 두 번 넣지 않게 하려는 것뿐이고, 저장 키도 하나만 씁니다. */
  function mirrorDates(fromSel, toSel, key) {
    var a = $(fromSel), b = $(toSel);
    if (!a || !b) return;
    on(fromSel, 'change', function () {
      b.value = a.value;
      save(key, a.value);
    });
  }

  function calcElig() {
    var box = $('#eligVerdicts');
    var E = T.pyElig;
    if (!box || !E) return;

    var startV = $('#eligStart') ? $('#eligStart').value : '';
    var endV = $('#eligEnd') ? $('#eligEnd').value : '';
    var exitV = $('#exitDate') ? $('#exitDate').value : '';
    var moved = radioVal('pyMoved');
    var hours = radioVal('pyHours');
    var nat = radioVal('pyNat');
    var type = radioVal('pyType');

    save('insStart', startV); save('insEnd', endV);
    save('payMoved', moved); save('payHours', hours);
    save('payNat', nat); save('payType', type);

    $('#eligResult').hidden = false;
    var tenureEl = $('#eligTenure');
    var months = null;

    if (startV) {
      var start = midnight(new Date(startV + 'T00:00:00'));
      /* 마지막 근무일이 비어 있으면 출국 예정일까지, 그것도 없으면 오늘까지 셉니다. */
      var end = endV ? midnight(new Date(endV + 'T00:00:00'))
                     : (exitV ? midnight(new Date(exitV + 'T00:00:00')) : today());
      if (end < start) {
        tenureEl.className = 'callout is-stop';
        tenureEl.textContent = E.badDates;
        box.innerHTML = '';
        return;
      }
      months = monthsWorked(start, end);
    }

    var over1y = months !== null && months >= 12;
    var nearly = months !== null && months >= 10 && months < 12;

    if (months === null) {
      tenureEl.className = 'callout is-warn';
      tenureEl.textContent = E.needHire;
    } else {
      var y = Math.floor(months / 12), mm = months % 12;
      var line = y > 0 ? E.tenureYM.replace('{y}', y).replace('{m}', mm)
                       : E.tenureM.replace('{m}', months);
      tenureEl.className = 'callout' + (over1y ? '' : (nearly ? ' is-warn' : ' is-stop'));
      tenureEl.textContent = line + ' ' +
        (over1y ? E.tenureOver : (nearly ? E.tenureNear : E.tenureUnder));
    }

    box.innerHTML = '';
    var I = E.items;

    /* 1) 출국만기보험금 — 한 사업장에서 계속 1년 이상이어야 근로자에게 갑니다.
          1년 미만이면 그 사업장 몫은 사업주에게 귀속됩니다
          (외국인고용법 시행령 제21조 제2항 제2호 단서). */
    var matKind, matBody;
    if (over1y) { matKind = 'ok'; matBody = I.mat.ok; }
    else if (moved === 'prevOver') { matKind = 'warn'; matBody = I.mat.prevOver; }
    else if (moved === 'unsure' || months === null) { matKind = 'warn'; matBody = I.mat.unsure; }
    else { matKind = 'no'; matBody = I.mat.no; }
    if (matKind === 'ok') {
      matBody += ' ' + (type === 'change' ? I.mat.typeChange
                     : (type === 'reentry' ? I.mat.typeReentry : I.mat.typeLeave));
    }
    box.appendChild(verdictCard(I.mat.n, matKind, matBody, I.mat.w));

    /* 2) 퇴직금 차액 — 계속근로 1년 이상 + 4주 평균 1주 15시간 이상
          (근로자퇴직급여 보장법 제4조 제1항). 위 계산기의 차액 칸과 짝입니다. */
    var sevKind, sevBody;
    if (over1y && hours === 'yes') { sevKind = 'ok'; sevBody = I.sev.ok; }
    else if (over1y && hours === 'unsure') { sevKind = 'warn'; sevBody = I.sev.hoursUnsure; }
    else if (over1y && hours === 'no') { sevKind = 'no'; sevBody = I.sev.hoursNo; }
    else if (moved === 'prevOver' || moved === 'unsure') { sevKind = 'warn'; sevBody = I.sev.prevOver; }
    /* 입사일을 모르면 판정할 수 없습니다. '대상 아님'으로 단정하지 않습니다. */
    else if (months === null) { sevKind = 'warn'; sevBody = I.sev.noDate; }
    else { sevKind = 'no'; sevBody = I.sev.no; }
    box.appendChild(verdictCard(I.sev.n, sevKind, sevBody, I.sev.w));

    /* 3) 귀국비용보험 — 근로자가 낸 돈이라 근속기간과 무관하게 돌려받습니다
          (시행령 제22조). 국가군에 따라 납부액이 다릅니다. */
    var amt = nat === 'g3' ? E.amt3 : (nat === 'g2' ? E.amt2 : E.amt1);
    box.appendChild(verdictCard(I.ret.n, 'ok', I.ret.ok.replace('{amt}', amt), I.ret.w));

    /* 4) 국민연금 반환일시금 — E-9 체류자격은 상호주의와 무관하게 대상입니다. */
    box.appendChild(verdictCard(I.pen.n, 'ok', I.pen.ok, I.pen.w));

    /* 5) 못 받은 임금·수당 — 출국 뒤에도 3년 안에 청구할 수 있습니다 (근로기준법 제49조). */
    box.appendChild(verdictCard(I.wage.n, 'warn', I.wage.ok, I.wage.w));
  }

  function calcIns() {
    var wageIn = $('#insWage'), startIn = $('#insStart'), endIn = $('#insEnd');
    if (!wageIn || !startIn) return;

    var wage = parseFloat(wageIn.value);
    if (!isFinite(wage) || wage <= 0) return;
    if (!startIn.value) return;

    var start = midnight(new Date(startIn.value + 'T00:00:00'));
    var end = endIn && endIn.value
      ? midnight(new Date(endIn.value + 'T00:00:00'))
      : today();

    var msg = $('#insMsg');
    $('#insResult').hidden = false;

    // 들어온 날이 그만두는 날보다 뒤면 계산이 성립하지 않습니다.
    if (end <= start) {
      $('#insWorkedOut').textContent = '–';
      $('#insFromOut').textContent = '–';
      $('#insEligOut').textContent = '–';
      $('#insSavedOut').textContent = '–';
      $('#insLegalOut').textContent = '–';
      $('#insGapRow').hidden = true;
      msg.className = 'callout is-stop';
      msg.textContent = T.insErrOrder;
      return;
    }

    var days = diffDays(end, start);            // start → end 사이의 날 수
    var years = Math.floor(days / 365);
    var restDays = days - years * 365;
    var months = Math.floor(restDays / 30);

    var joinDue = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 15);
    var eligible = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

    // 쌓인 보험료 ≈ 월 통상임금 × 8.3% × 일한 달 수
    var monthsTotal = days / 30.4375;
    var saved = wage * INS_RATE * monthsTotal;
    // 법정 퇴직금 ≈ 30일분 임금 × (재직일수 / 365)
    var legal = wage * (days / 365);
    var gap = legal - saved;

    $('#insWorkedOut').textContent =
      (years > 0 ? years + (T.yearUnit || '년') + ' ' : '') +
      months + (T.monthUnit || '개월') +
      ' (' + days + (T.dayUnitPlain || '일') + ')';
    $('#insFromOut').textContent = fmtDay(joinDue) + ' ' + (T.insFromTail || '까지');
    $('#insEligOut').textContent = fmtDay(eligible);

    $('#insSavedOut').textContent = wonFmt(saved);
    $('#insLegalOut').textContent = wonFmt(legal);

    // 차액은 회사가 채워 줘야 하는 몫입니다. 1만원 넘게 벌어질 때만 보여
    // 반올림 때문에 생기는 잔돈으로 놀라지 않게 합니다.
    var gapRow = $('#insGapRow');
    if (gap > 10000) {
      gapRow.hidden = false;
      $('#insGapOut').textContent = wonFmt(gap);
    } else {
      gapRow.hidden = true;
    }

    var eligBox = $('#insEligBox');
    if (days < INS_MIN_DAYS) {
      // 1년을 못 채우면 근로자가 못 받고 회사로 돌아갑니다. 가장 중요한 안내입니다.
      var left = INS_MIN_DAYS - days;
      eligBox.className = 'ins-box is-warn';
      msg.className = 'callout is-warn';
      msg.textContent = T.insMsgShort.replace('{d}', String(left)) ;
    } else {
      eligBox.className = 'ins-box is-go';
      msg.className = 'callout';
      msg.textContent = T.insMsgOk;
    }
  }

  /* ---------- 공지 ---------- */
  function renderNotices() {
    var list = $('#noticeList');
    if (!list) return;
    list.innerHTML = '';

    /* 최신 소식이 위로 오게 정렬합니다. 날짜가 없는 옛 항목은 뒤로 보냅니다.
       원본 배열은 건드리지 않습니다 — 다른 곳에서 순서를 기대할 수 있습니다. */
    var sorted = NOTICES.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    sorted.forEach(function (n) {
      var body = n[lang] || n.en;
      var art = el('article', 'notice');

      var head = el('button', 'notice-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', 'false');
      var tagLabel = (T.noticeTags && T.noticeTags[n.tagKey]) || n.tagKey;
      head.appendChild(el('span', 'notice-tag', tagLabel));
      // 날짜를 제목 옆에 크게 둡니다. "언제 바뀐 것인가" 가 이 쪽의 핵심입니다.
      if (n.date) head.appendChild(el('span', 'notice-date', n.date));
      head.appendChild(el('p', 'notice-t', body.title));
      head.appendChild(el('span', 'notice-arrow', '⌄'));
      head.addEventListener('click', function () {
        var open = art.classList.toggle('is-open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      var wrap = el('div', 'notice-body');
      var ul = el('ul');
      body.points.forEach(function (p) { ul.appendChild(el('li', null, p)); });
      wrap.appendChild(ul);

      /* 질문 기능이 다른 페이지로 갈라져서 링크로 넘깁니다.
         진짜 <a> 라야 새 탭 열기와 JS 없는 환경에서도 동작합니다. */
      var ask = el('a', 'btn btn-ghost btn-sm', T.ntAskBtn);
      ask.href = 'ask.html?q=' + encodeURIComponent(body.title);
      /* 일부 호스트는 .html 을 clean URL 로 넘기면서 쿼리를 버립니다(로컬 serve 가 그렇습니다).
         같은 값을 sessionStorage 에도 넣어 두고 질문 페이지에서 남은 쪽을 씁니다. */
      ask.addEventListener('click', function () {
        try { sessionStorage.setItem('eum.carryQ', body.title); } catch (e) {}
      });
      wrap.appendChild(ask);

      var meta = el('div', 'notice-meta');
      meta.appendChild(el('span', null, T.ntSourceLabel + ': ' + n.source));
      meta.appendChild(el('span', null, T.ntCheckedLabel + ': ' + n.checked));
      var a = el('a', null, T.ntOriginal);
      a.href = n.url; a.target = '_blank'; a.rel = 'noopener';
      meta.appendChild(a);
      wrap.appendChild(meta);

      art.appendChild(head);
      art.appendChild(wrap);
      list.appendChild(art);
    });
  }

  /* ---------- 인터뷰 ---------- */
  /* 데이터가 비어 있으면 목록 대신 "준비 중" 안내만 보입니다.
     지어낸 인터뷰를 채워 두느니 빈 화면을 보이는 편이 낫습니다 —
     읽는 사람이 남의 경험을 근거로 자기 일을 결정하기 때문입니다. */
  function renderInterviews() {
    var list = $('#itvList');
    if (!list) return;

    var has = typeof INTERVIEWS !== 'undefined' && INTERVIEWS && INTERVIEWS.length;
    var empty = $('#itvEmpty');
    if (empty) empty.hidden = !!has;
    list.hidden = !has;
    list.innerHTML = '';

    var quotes = $('#itvQuotes'), qEmpty = $('#itvQuotesEmpty');
    if (quotes) quotes.innerHTML = '';
    if (!has) {
      if (qEmpty) qEmpty.hidden = false;
      return;
    }
    if (qEmpty) qEmpty.hidden = true;

    var sorted = INTERVIEWS.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    sorted.forEach(function (it) {
      var body = it[lang] || it.en || it.ko;
      if (!body) return;

      var art = el('article', 'itv-card');

      /* 누구인지 — 가명·국적·연차·업종만 씁니다.
         이름과 회사는 데이터에 아예 넣지 않습니다. */
      var who = el('div', 'itv-who');
      var label = (T.itvAlias || '{n}').replace('{n}', it.alias || '?');
      who.appendChild(el('span', 'itv-alias', label));
      var facts = [];
      if (it.country && T.itvCountries) facts.push(T.itvCountries[it.country] || it.country);
      if (it.years) facts.push((T.itvYears || '{y}').replace('{y}', it.years));
      if (it.field && T.itvFields) facts.push(T.itvFields[it.field] || it.field);
      if (facts.length) who.appendChild(el('span', 'itv-facts', facts.join(' · ')));
      art.appendChild(who);

      if (body.intro) art.appendChild(el('p', 'itv-intro', body.intro));

      (body.qa || []).forEach(function (row) {
        var qa = el('div', 'itv-qa');
        qa.appendChild(el('p', 'itv-q', row.q));
        qa.appendChild(el('p', 'itv-a', row.a));
        art.appendChild(qa);
      });

      if (it.date) art.appendChild(el('p', 'itv-date', it.date));
      list.appendChild(art);

      /* 사이트를 써 본 소감은 아래 칸에 따로 모읍니다. */
      if (quotes && body.useQuote) {
        var q = el('blockquote', 'itv-quote');
        q.appendChild(el('p', null, body.useQuote));
        q.appendChild(el('cite', null, label));
        quotes.appendChild(q);
      }
    });

    if (quotes && !quotes.children.length && qEmpty) qEmpty.hidden = false;
  }

  /* ---------- 묻고 답하기 ---------- */
  /* 목록은 서버가 이미 해당 언어로 만들어 보내 줍니다. 여기서는 번역하지 않습니다.
     번역은 질문 등록 때와 답변 게시 때 각 1회뿐이고, 조회는 저장된 문자열을 그대로
     씁니다. 언어를 바꾸면 다시 받아 오지만 응답이 캐시되므로 비용이 늘지 않습니다. */
  var boardSeq = 0;                       // 늦게 온 응답이 새 화면을 덮지 않게
  var boardMsgKey = null, boardMsgKind = null;

  function boardMsg(key, kind) {
    boardMsgKey = key || null;
    boardMsgKind = kind || null;
    var box = $('#boardMsg');
    if (!box) return;
    box.textContent = boardMsgKey ? (T[boardMsgKey] || '') : '';
    box.className = 'board-msg' + (boardMsgKind ? ' is-' + boardMsgKind : '');
  }

  /* 목록에 보일 한 줄짜리 제목. 본문 첫 줄을 잘라 씁니다.
     따로 제목 칸을 두지 않은 이유는, 급한 사람에게 칸을 하나라도 덜 채우게
     하려는 것입니다. */
  function boardSubject(text) {
    var one = String(text || '').split(/\r?\n/)[0].trim();
    if (one.length > 60) one = one.slice(0, 60) + '…';
    return one || '—';
  }

  /* 날짜. 오늘 쓴 글은 시:분으로, 그 전은 날짜로 보여 줍니다. */
  function boardWhen(at) {
    if (!at) return '—';
    var d = new Date(at);
    if (isNaN(d.getTime())) return String(at).slice(0, 10);
    var now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    if (sameDay) return p(d.getHours()) + ':' + p(d.getMinutes());
    return String(d.getFullYear()).slice(2) + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  /* 글 한 줄. 누르면 아래로 펼쳐집니다.
     잠긴 글(남의 비공개 글)은 서버가 본문을 아예 보내지 않으므로 펼치지 않습니다. */
  function boardRow(it, no) {
    var wrap = el('article', 'board-item' + (it.locked ? ' is-locked' : ''));

    var row = document.createElement(it.locked ? 'div' : 'button');
    row.className = 'board-row';
    if (!it.locked) { row.type = 'button'; row.setAttribute('aria-expanded', 'false'); }

    row.appendChild(el('span', 'bt-no', no != null ? String(no) : '—'));

    var qcell = el('span', 'bt-q');
    if (it.isPrivate) {
      var lock = el('span', 'board-lock');
      lock.textContent = '🔒';
      lock.setAttribute('aria-hidden', 'true');
      qcell.appendChild(lock);
    }
    qcell.appendChild(el('span', 'bt-subject',
      it.locked ? T.boardLockedSubject : boardSubject(it.body)));
    if (it.answered) qcell.appendChild(el('span', 'board-badge is-answered', T.boardAnsweredBadge));
    if (it.mine && it.isPrivate) qcell.appendChild(el('span', 'board-badge is-private', T.boardPrivateBadge));
    row.appendChild(qcell);

    row.appendChild(el('span', 'bt-user', it.username || '—'));
    row.appendChild(el('span', 'bt-at', boardWhen(it.at)));
    wrap.appendChild(row);

    if (it.locked) return wrap;

    var panel = el('div', 'board-panel');
    panel.hidden = true;
    panel.appendChild(el('p', 'board-body', it.body || ''));

    if (it.answer) {
      var a = el('div', 'board-a');
      a.appendChild(el('span', 'board-a-label', T.boardAnswer));
      a.appendChild(el('span', null, it.answer));
      panel.appendChild(a);
      if (it.src || it.checked) {
        var meta = el('div', 'board-meta');
        if (it.src) meta.appendChild(el('span', null, T.ntSourceLabel + ': ' + it.src));
        if (it.checked) meta.appendChild(el('span', null, T.ntCheckedLabel + ': ' + it.checked));
        panel.appendChild(meta);
      }
    } else {
      panel.appendChild(el('p', 'board-pending', T.boardNoAnswerYet));
    }

    // 관리자에게만 보이는 답변 작성/수정 칸. 비공개 글도 관리자는 볼 수 있으므로
    // 여기서 바로 답할 수 있습니다.
    if (me && me.isAdmin) panel.appendChild(boardAdminBox(it));

    wrap.appendChild(panel);

    row.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      row.setAttribute('aria-expanded', open ? 'true' : 'false');
      wrap.classList.toggle('is-open', open);
    });

    return wrap;
  }

  function boardAdminBox(it) {
    var box = el('div', 'board-admin');
    box.appendChild(el('p', 'board-admin-label', T.adminAnswerLabel));

    var ta = document.createElement('textarea');
    ta.className = 'board-admin-ta';
    ta.rows = 3;
    ta.maxLength = 2000;
    ta.placeholder = T.adminAnswerPh || '';
    ta.value = it.answer || '';
    box.appendChild(ta);

    var src = document.createElement('input');
    src.type = 'text';
    src.className = 'board-admin-src';
    src.placeholder = T.adminSrcLabel || '';
    src.value = it.src || '';
    box.appendChild(src);

    var row = el('div', 'board-admin-row');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = T.adminSaveBtn;
    row.appendChild(btn);
    var msg = el('span', 'board-admin-msg');
    row.appendChild(msg);
    box.appendChild(row);

    btn.addEventListener('click', function () {
      var text = ta.value.trim();
      if (text.length < 5 || text.length > 2000) {
        msg.textContent = T.errAnswerRule; msg.className = 'board-admin-msg is-bad';
        return;
      }
      btn.disabled = true;
      msg.textContent = T.authWorking; msg.className = 'board-admin-msg';
      submitAnswer(it.id, text, src.value.trim())
        .then(function (ok) {
          msg.textContent = ok ? T.adminAnswerOk : T.errNet;
          msg.className = 'board-admin-msg' + (ok ? ' is-good' : ' is-bad');
          if (ok) renderBoard(boardPage);
        })
        .then(function () { btn.disabled = false; });
    });

    return box;
  }

  function submitAnswer(id, answer, src) {
    return fetch('api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'answer', id: id, answer: answer, src: src })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (out) { return !!(out.ok && out.data && out.data.ok); })
      .catch(function (e) { console.warn('answer submit failed', e); return false; });
  }

  /* 쪽 넘김. 한 쪽에 10개씩 서버가 잘라 보냅니다. */
  var boardPage = 1, boardPages = 1, boardTotal = 0, boardPer = 10, boardQ = '';

  /* 1 2 3 … 처럼 번호를 직접 찍습니다. 쪽이 아무리 많아도 한 번에 10개까지만
     보여, 좁은 화면에서 줄이 넘치지 않게 합니다. */
  function paintPager() {
    var nav = $('#boardPager');
    if (!nav) return;
    nav.hidden = boardPages <= 1;

    var box = $('#pageNums');
    if (box) {
      box.innerHTML = '';
      var block = 10;
      var start = Math.floor((boardPage - 1) / block) * block + 1;
      var end = Math.min(boardPages, start + block - 1);
      for (var n = start; n <= end; n++) {
        (function (num) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'pg-num' + (num === boardPage ? ' is-on' : '');
          b.textContent = String(num);
          if (num === boardPage) b.setAttribute('aria-current', 'page');
          b.addEventListener('click', function () { renderBoard(num); });
          box.appendChild(b);
        })(n);
      }
    }
    $('#pagePrev').disabled = boardPage <= 1;
    $('#pageNext').disabled = boardPage >= boardPages;
  }

  function paintFound() {
    var p = $('#boardFound');
    var clear = $('#boardQClear');
    if (clear) clear.hidden = !boardQ;
    if (!p) return;
    if (!boardQ) { p.hidden = true; p.textContent = ''; return; }
    p.hidden = false;
    p.textContent = '"' + boardQ + '" · ' + boardTotal + (T.boardFoundUnit || '건');
  }

  function renderBoard(page) {
    var list = $('#boardList');
    if (!list) return;
    if (page) boardPage = page;
    var seq = ++boardSeq;

    var url = 'api/posts?page=' + boardPage + '&lang=' + encodeURIComponent(lang);
    if (boardQ) url += '&q=' + encodeURIComponent(boardQ);

    fetch(url, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
      .then(function (data) {
        if (seq !== boardSeq) return;
        var items = (data && data.items) || [];
        boardPage = (data && data.page) || 1;
        boardPages = (data && data.pages) || 1;
        boardTotal = (data && data.total) || 0;
        boardPer = (data && data.perPage) || 10;

        list.innerHTML = '';
        if (!items.length) {
          list.appendChild(el('p', 'board-empty', boardQ ? T.boardNoResult : T.boardEmpty));
        } else {
          // 최신 글이 맨 위이므로, 번호는 전체 개수에서 거꾸로 셉니다.
          var first = boardTotal - (boardPage - 1) * boardPer;
          items.forEach(function (it, i) { list.appendChild(boardRow(it, first - i)); });
        }
        paintPager();
        paintFound();
        if (page) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (e) {
        if (seq !== boardSeq) return;
        /* 서버가 없는 배포(GitHub Pages)에서도 화면이 깨지지 않게 안내만 남깁니다.
           나머지 기능은 그대로 동작합니다. */
        console.warn('board list unavailable', e);
        list.innerHTML = '';
        list.appendChild(el('p', 'board-empty', T.boardListFail));
        boardPages = 1;
        paintPager();
      });
  }

  function submitQuestion(text, isPrivate) {
    var btn = $('#boardSend');
    btn.disabled = true;
    boardMsg('boardSending');

    fetch('api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: text, lang: lang, private: !!isPrivate })
    })
      .then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, data: d }; });
      })
      .then(function (out) {
        if (!out.ok) {
          // 로그인이 풀렸으면 글쓰기 상자를 닫고 안내로 바꿉니다.
          if (out.data && out.data.error === 'errNeedLogin') { setUser(null); paintAuth(); }
          boardMsg((out.data && out.data.error) || 'boardFail', 'bad');
          return;
        }
        $('#boardInput').value = '';
        if ($('#boardPrivate')) $('#boardPrivate').checked = false;
        boardMsg('boardSent', 'good');
        renderBoard(1);
      })
      .catch(function (e) {
        console.warn('board submit failed', e);
        boardMsg('boardFail', 'bad');
      })
      .then(function () { btn.disabled = false; });
  }

  /* ---------- 로그인 ---------- */
  /* 로그인 여부만 화면에 반영합니다. 실제 확인은 서버가 쿠키로 합니다.
     브라우저 쪽 값은 표시용일 뿐이라, 고쳐도 글이 써지지는 않습니다. */
  var me = null;

  function setUser(u) { me = u || null; }

  /* 머리말 메뉴 — 로그인했으면 [이름 ▾] 단추 하나만 두고
     계정 설정과 로그아웃은 그 안에 넣습니다. 좁은 화면에서 단추 두 개가
     나란히 서면 브랜드 이름이 밀려 줄바꿈되기 때문입니다. */
  function closeMenu() {
    var menu = $('#authMenu'), btn = $('#authToggle');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    var menu = $('#authMenu'), btn = $('#authToggle');
    if (!menu || !btn) return;
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function paintAuth() {
    var slot = $('#authSlot'), menu = $('#authMenu');
    if (slot) {
      slot.innerHTML = '';
      if (me) {
        var name = me.nickname || me.username;
        var btn = el('button', 'auth-btn auth-toggle', name + (T.authHello || ''));
        btn.type = 'button';
        btn.id = 'authToggle';
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'authMenu');
        btn.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
        slot.appendChild(btn);
      } else {
        var a = el('a', 'auth-btn', T.navLogin);
        a.href = 'login.html';
        slot.appendChild(a);
        if (menu) menu.hidden = true;
      }
    }
    // 로그아웃하면 메뉴가 열린 채로 남지 않게 합니다.
    if (!me) closeMenu();

    // 게시판: 로그인했으면 글쓰기 상자, 아니면 안내
    var form = $('#boardForm'), gate = $('#boardGate');
    if (form && gate) { form.hidden = !me; gate.hidden = !!me; }

    // 마이페이지: 로그인 안 했으면 안내만 보입니다
    var acBody = $('#acBody'), acGate = $('#acGate');
    if (acBody && acGate) { acBody.hidden = !me; acGate.hidden = !!me; }
  }

  /* 어떤 로그인 방법이 켜져 있는지는 서버만 압니다(키가 있는지 브라우저는 모릅니다).
     그래서 목록을 받아 와서 켜진 버튼만 보여 줍니다. 키를 안 넣은 버튼을
     띄워 두면 눌렀을 때만 실패해서, 사용자는 왜 안 되는지 알 수 없습니다. */
  var methods = [];

  function paintSocial() {
    var box = $('#socialBox');
    if (!box) return;
    if (!methods.length) { box.hidden = true; return; }
    box.hidden = false;

    var map = { google: '#btnGoogle', kakao: '#btnKakao' };
    Object.keys(map).forEach(function (name) {
      var b = $(map[name]);
      if (b) b.hidden = methods.indexOf(name) < 0;
    });
  }

  function loadMe() {
    return fetch('api/auth', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { user: null }; })
      .then(function (d) {
        setUser(d && d.user);
        methods = (d && d.methods) || [];
      })
      .catch(function () { setUser(null); methods = []; })
      .then(function () {
        paintAuth(); paintSocial();
        syncAccountLang();
        // 관리자 답변 칸은 로그인 여부를 알아야 그리므로, 로그인 확인이
        // 끝난 뒤 게시판을 한 번 더(비로그인 상태로 이미 그렸다면) 그립니다.
        if ($('#boardList')) renderBoard(boardPage);
      });
  }

  /* 로그인한 계정의 언어를 화면 언어와 맞춥니다.
     · 계정에 저장된 언어가 있고 지금 화면과 다르면 → 계정 쪽을 따릅니다
       (다른 기기에서 로그인해도 저장해 둔 언어로 바로 보이게 됩니다).
     · 계정에 아직 저장된 언어가 없으면 → 지금 화면 언어(대개 이 기기 언어를
       자동 감지한 값)를 계정에 저장해, 다음에 다른 기기로 로그인할 때부터
       이 값을 따르게 합니다. */
  function syncAccountLang() {
    if (!me) return;
    if (me.lang && isLang(me.lang) && me.lang !== lang) {
      save('lang', me.lang);
      applyLang(me.lang);
      return;
    }
    if (!me.lang) pushAccountLang(lang);
  }

  function pushAccountLang(code) {
    if (!me || !isLang(code)) return;
    fetch('api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'lang', lang: code })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok && me) me.lang = d.lang || code; })
      .catch(function (e) { console.warn('lang sync failed', e); });
  }

  function logout() {
    fetch('api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    })
      .catch(function () {})
      .then(function () {
        setUser(null); paintAuth();
        if ($('#boardList')) renderBoard(boardPage);
      });
  }

  var authMsgKey = null, authMsgKind = null;

  function authMsg(key, kind) {
    authMsgKey = key || null;
    authMsgKind = kind || null;
    var box = $('#authMsg');
    if (!box) return;
    box.textContent = authMsgKey ? (T[authMsgKey] || T.errNet) : '';
    box.className = 'auth-msg' + (authMsgKind ? ' is-' + authMsgKind : '');
  }

  function authSend(action, payload, okKey, after) {
    authMsg('authWorking');
    fetch('api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, payload))
    })
      .then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, data: d }; });
      })
      .then(function (out) {
        if (!out.ok || !out.data || !out.data.ok) {
          authMsg((out.data && out.data.error) || 'errNet', 'bad');
          return;
        }
        setUser(out.data.user || null);
        authMsg(okKey, 'good');
        paintAuth();
        setTimeout(after, 700);
      })
      .catch(function (e) {
        console.warn('auth failed', e);
        authMsg('errNet', 'bad');
      });
  }

  /* ---------- 마이페이지 ---------- */

  var acInfo = null;

  function acMsg(box, key, kind) {
    var n = $(box);
    if (!n) return;
    n.textContent = key ? (T[key] || T.errNet) : '';
    n.className = 'auth-msg' + (kind ? ' is-' + kind : '');
  }

  /* 로그인 방법을 사람이 읽는 말로 바꿉니다. */
  function providerName(p) {
    if (p === 'google') return 'Google';
    if (p === 'kakao') return T.socialKakao ? '\uce74\uce74\uc624' : 'Kakao';
    return T.acWayPassword || '\uc544\uc774\ub514 \u00b7 \ube44\ubc00\ubc88\ud638';
  }

  function paintAccount() {
    if (!acInfo || !$('#acBody')) return;

    $('#acProvider').textContent = providerName(acInfo.provider);
    $('#acJoined').textContent = acInfo.joined || '-';

    // 소셜 계정의 아이디는 user_1a2b3c4d 같은 내부용 값이라 보여 줘도 쓸 데가 없습니다.
    var isPw = acInfo.provider === 'password';
    $('#acUsername').textContent = isPw ? acInfo.username : (T.acIdHidden || '-');

    var nick = $('#acNick');
    if (nick && !nick.value) nick.value = acInfo.nickname || '';

    // 비밀번호 칸은 비밀번호로 가입한 사람에게만 보입니다.
    var pwBlock = $('#pwBlock'), pwNote = $('#pwSocialNote'), idNote = $('#acIdNote');
    if (pwBlock) pwBlock.hidden = !isPw;
    if (pwNote) pwNote.hidden = isPw;
    if (idNote) idNote.hidden = !isPw;

    var birth = $('#acBirth');
    if (birth) birth.value = acInfo.birthdate || '';
    var nation = $('#acNation');
    if (nation) nation.value = acInfo.nationality || '';
    var gender = $('#acGender');
    if (gender) gender.value = acInfo.gender || '';
  }

  function loadAccount() {
    if (!$('#acBody')) return;
    return fetch('api/account', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { acInfo = d; paintAccount(); })
      .catch(function () { acMsg('#nickMsg', 'errNet', 'bad'); });
  }

  function saveNick(nickname) {
    acMsg('#nickMsg', 'authWorking');
    fetch('api/account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'nickname', nickname: nickname })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (out) {
        if (!out.ok || !out.data || !out.data.ok) {
          acMsg('#nickMsg', (out.data && out.data.error) || 'errNet', 'bad');
          return;
        }
        acMsg('#nickMsg', 'acNickOk', 'good');
        if (acInfo) acInfo.nickname = out.data.nickname;
        // 머리말에 걸린 이름도 그 자리에서 바꿉니다.
        if (me) { me.nickname = out.data.nickname; paintAuth(); }
      })
      .catch(function (e) {
        console.warn('nickname failed', e);
        acMsg('#nickMsg', 'errNet', 'bad');
      });
  }

  function savePw(current, next) {
    acMsg('#pwMsg', 'authWorking');
    fetch('api/account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'password', current: current, next: next })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (out) {
        if (!out.ok || !out.data || !out.data.ok) {
          acMsg('#pwMsg', (out.data && out.data.error) || 'errNet', 'bad');
          return;
        }
        acMsg('#pwMsg', 'acPwOk', 'good');
        // 바꾼 비밀번호가 화면에 남아 있지 않게 지웁니다.
        $('#acPwNow').value = '';
        $('#acPwNew').value = '';
        $('#acPwNew2').value = '';
      })
      .catch(function (e) {
        console.warn('password failed', e);
        acMsg('#pwMsg', 'errNet', 'bad');
      });
  }

  function saveProfile(birthdate, nationality, gender) {
    acMsg('#profileMsg', 'authWorking');
    fetch('api/account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'profile', birthdate: birthdate, nationality: nationality, gender: gender })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (out) {
        if (!out.ok || !out.data || !out.data.ok) {
          acMsg('#profileMsg', (out.data && out.data.error) || 'errNet', 'bad');
          return;
        }
        acMsg('#profileMsg', 'acProfileOk', 'good');
        if (acInfo) {
          acInfo.birthdate = out.data.birthdate;
          acInfo.nationality = out.data.nationality;
          acInfo.gender = out.data.gender;
        }
      })
      .catch(function (e) {
        console.warn('profile failed', e);
        acMsg('#profileMsg', 'errNet', 'bad');
      });
  }

  /* ---------- 질문 답변 ---------- */
  function renderChips() {
    var box = $('#askChips');
    if (!box) return;
    box.innerHTML = '';
    (T.chips || []).forEach(function (c) {
      var b = el('button', 'chip', c);
      b.type = 'button';
      b.addEventListener('click', function () { $('#askInput').value = c; answer(c); });
      box.appendChild(b);
    });
  }

  function clearThread() { var t = $('#thread'); if (t) t.innerHTML = ''; }

  function findEntry(q) {
    var text = q.toLowerCase();
    var best = null, bestScore = 0;
    KB.forEach(function (item) {
      var score = 0;
      item.keywords.forEach(function (k) {
        if (text.indexOf(String(k).toLowerCase()) !== -1) score += String(k).length;
      });
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return bestScore > 0 ? best : null;
  }

  function apiPost(path, payload) {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) {
        // 왜 실패했는지 화면에서 구분할 수 있도록 상태를 함께 실어 보냅니다.
        var err = new Error('http ' + r.status);
        err.status = r.status;
        return r.json().catch(function () { return {}; }).then(function (d) {
          err.retryable = !!(d && d.retryable) || r.status === 503;
          throw err;
        });
      }
      return r.json();
    });
  }

  function answer(question) {
    var thread = $('#thread');
    if (!thread) return;
    thread.appendChild(el('div', 'bubble bubble-u', question));

    var box = el('div', 'bubble bubble-a');
    var wait = el('p');
    wait.appendChild(el('span', 'spin'));
    wait.appendChild(document.createTextNode(T.askThinking));
    box.appendChild(wait);
    thread.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    apiPost('/api/ask', { question: question, lang: lang })
      .then(function (data) {
        if (!data || !data.answer) throw new Error('empty');
        fillAnswer(box, data.answer, null, false);
      })
      .catch(function (e) {
        /* 먼저 브라우저 안의 지식베이스에서 찾아 봅니다. 답이 있으면
           서버가 잠깐 안 되더라도 사용자는 답을 얻습니다. */
        var hit = findEntry(question);
        if (hit) { fillAnswer(box, hit[lang] || hit.en, hit.src, true, hit.review); return; }

        /* 지식베이스에도 없을 때 — 몰려서 실패한 것이면 그렇게 말해 줍니다.
           "답을 못 찾았다" 고만 하면 다시 눌러 볼 생각을 못 합니다. */
        if (e && e.retryable) fillAnswer(box, T.askBusy, null, true);
        else fillAnswer(box, T.askFallback, null, true);
      });
  }

  function fillAnswer(box, text, src, offline, review) {
    box.innerHTML = '';
    if (review) box.appendChild(el('span', 'flag', T.askReview));
    String(text).split('\n').forEach(function (line) {
      if (line.trim()) box.appendChild(el('p', null, line.trim()));
    });
    if (src) box.appendChild(el('p', 'bubble-src', T.askSourceLabel + ': ' + src));
    if (offline) box.appendChild(el('p', 'bubble-dis', T.askOffline));
    box.appendChild(el('p', 'bubble-dis', T.disclaimer));
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- 사진에서 읽기 ---------- */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var max = 1600;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var url = c.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(img.src);
        resolve(url.split(',')[1]);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function readDoc() {
    var f = $('#docFile').files && $('#docFile').files[0];
    if (!f) return;
    var out = $('#docReadOut');
    var btn = $('#docRead');

    out.hidden = false;
    out.className = 'read-out';
    out.innerHTML = '';
    var wait = el('p');
    wait.appendChild(el('span', 'spin'));
    wait.appendChild(document.createTextNode(T.ckReading));
    out.appendChild(wait);
    btn.disabled = true;

    shrink(f)
      .then(function (b64) {
        return apiPost('/api/read-doc', { image: b64, mediaType: 'image/jpeg', lang: lang });
      })
      .then(function (d) { showRead(d); })
      .catch(function () {
        out.className = 'read-out is-warn';
        out.innerHTML = '';
        out.appendChild(el('p', null, T.ckReadFail));
      })
      .then(function () { btn.disabled = false; });
  }

  function showRead(d) {
    var out = $('#docReadOut');
    out.className = 'read-out';
    out.innerHTML = '';
    out.appendChild(el('h5', null, T.ckReadOk + (d.docType ? ' — ' + d.docType : '')));

    var dl = el('dl');
    function row(k, v) {
      dl.appendChild(el('dt', null, k));
      dl.appendChild(el('dd', null, v || T.ckReadNone));
    }
    row(T.ckReadEmployer, d.employer);
    row(T.ckReadEnd, d.endDate);
    row(T.ckReadReason, d.statedReason);
    out.appendChild(dl);

    // 읽은 값을 화면에 채워 넣습니다. 판단은 아래 규칙 엔진이 합니다.
    var applied = false;
    if (d.endDate && !$('#leaveDate').value) {
      $('#leaveDate').value = d.endDate;
      calcDday();
      applied = true;
    }
    if (d.reasonCategory && d.reasonCategory !== 'unknown') {
      var radio = document.querySelector('input[name=q1][value=' + d.reasonCategory + ']');
      if (radio) { radio.checked = true; applied = true; }
    }
    if (applied) out.appendChild(el('p', 'read-note', T.ckReadApplied));
    if (d.note) out.appendChild(el('p', 'read-note', d.note));
    out.appendChild(el('p', 'read-note', T.ckReadNote));
  }

  /* ---------- 섹션 바로가기 ---------- */
  /* 스티키 헤더 높이는 언어와 화면폭에 따라 달라집니다. 고정값으로 두면
     어떤 언어에서는 눌러서 이동했을 때 제목이 헤더에 가려집니다.
     실제 높이를 재서 CSS 변수로 넘기고, 거기서 scroll-margin-top 을 잡습니다. */
  function syncStick() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    document.documentElement.style.setProperty('--stick', bar.offsetHeight + 'px');
  }

  function initSecNav() {
    var nav = $('#secnav');
    if (!nav) return;

    // 화면이 좁으면 활성 항목이 가로 스크롤 밖으로 나갑니다. 보이는 자리로 끌어옵니다.
    function keepInView(chip) {
      var left = chip.offsetLeft, right = left + chip.offsetWidth;
      var from = nav.scrollLeft, to = from + nav.clientWidth;
      if (left < from + 12) nav.scrollLeft = Math.max(0, left - 12);
      else if (right > to - 12) nav.scrollLeft = right - nav.clientWidth + 12;
    }

    /* 기능마다 페이지가 따로 있으므로 지금 열려 있는 파일 이름으로 현재 위치를 정합니다.
       Vercel 과 로컬 serve 는 기본이 clean URL 이라 주소에서 .html 이 사라집니다
       (reason.html → /reason). 그래서 양쪽 다 확장자를 떼고 비교합니다.
       주소가 "/" 로 끝나면 index 로 봅니다. */
    function fileOf(path) {
      var name = String(path || '').split(/[?#]/)[0].split('/').pop();
      name = (name || '').toLowerCase().replace(/\.html?$/, '');
      return name || 'index';
    }

    var here = fileOf(location.pathname);
    var topChip = null; // 공지/질문처럼 드롭다운 안에 있으면, 화면에 보이는 트리거(게시판)를 대신 강조합니다.
    Array.prototype.forEach.call(nav.querySelectorAll('a[href]'), function (a) {
      var on = fileOf(a.getAttribute('href')) === here;
      a.classList.toggle('is-on', on);
      if (on) {
        a.setAttribute('aria-current', 'page');
        var item = a.closest('.secnav-item');
        topChip = item ? item.querySelector(':scope > a') : a;
      } else {
        a.removeAttribute('aria-current');
      }
    });
    if (topChip) { topChip.classList.add('is-on'); keepInView(topChip); }
  }

  /* 게시판 옆에 접힌 공지·질문 드롭다운을 마우스를 올리거나 초점을 두면 보여 줍니다.
     화면 밖으로 잘리지 않도록 position:fixed 로 트리거 바로 아래에 직접 좌표를 맞춥니다. */
  function initSecDrop() {
    $$('.secnav-item').forEach(function (item) {
      var trigger = item.querySelector(':scope > a');
      var drop = item.querySelector('.secnav-drop');
      if (!trigger || !drop) return;
      var hideTimer;
      function show() {
        clearTimeout(hideTimer);
        var r = trigger.getBoundingClientRect();
        drop.style.top = (r.bottom + 6) + 'px';
        drop.style.left = r.left + 'px';
        drop.classList.add('is-open');
      }
      function hide() {
        hideTimer = setTimeout(function () { drop.classList.remove('is-open'); }, 150);
      }
      item.addEventListener('mouseenter', show);
      item.addEventListener('mouseleave', hide);
      item.addEventListener('focusin', show);
      item.addEventListener('focusout', hide);
    });
  }

  /* car-track 은 잘리는 창(overflow:hidden), car-list 가 그 안에서 실제로
     밀려나는 줄입니다. 이 둘을 하나로 합쳐 두면 transform 을 줄 때 잘리는
     창 자체가 같이 밀려나서 옆 화살표 버튼을 덮어버립니다. */
  function initCarousels() {
    $$('.carousel').forEach(function (car) {
      var track = car.querySelector('.car-track');
      var list = car.querySelector('.car-list');
      var prev = car.querySelector('.car-prev');
      var next = car.querySelector('.car-next');
      if (!track || !list || !prev || !next) return;
      var pos = 0;

      function cardStep() {
        var card = list.querySelector('.hcard');
        if (!card) return track.clientWidth;
        var gap = parseFloat(getComputedStyle(list).columnGap) || 14;
        return card.getBoundingClientRect().width + gap;
      }
      function maxPos() { return Math.max(0, list.scrollWidth - track.clientWidth); }
      function apply() {
        pos = Math.max(0, Math.min(pos, maxPos()));
        list.style.transform = 'translateX(-' + pos + 'px)';
      }
      prev.addEventListener('click', function () { pos -= cardStep(); apply(); });
      next.addEventListener('click', function () { pos += cardStep(); apply(); });
      window.addEventListener('resize', apply);
    });
  }

  /* ---------- 시작 ---------- */
  /* 기능마다 페이지가 따로 있어서, 지금 열린 페이지에 없는 요소가 늘 있습니다.
     on() 은 요소가 있을 때만 연결합니다. */
  function on(sel, ev, fn) {
    var n = $(sel);
    if (n) n.addEventListener(ev, fn);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var d = detect();
    // 링크(?lang=)로 들어온 선택도 다음 방문까지 유지합니다.
    if (d.source === 'url') save('lang', d.code);
    // 아직 지원하지 않는 언어면 안내 문구를 바꿔 끼웁니다 (화면은 영어로 나옵니다).
    if (!d.matched) {
      var toastText = $('#langToastText');
      if (toastText) toastText.setAttribute('data-i18n', 'langUnsupported');
    }
    applyLang(d.code);

    var toast = $('#langToast');
    if (toast && d.auto && d.code !== 'ko') {
      toast.hidden = false;
      setTimeout(function () { toast.hidden = true; }, 7000);
    }
    on('#toastClose', 'click', function () { if (toast) toast.hidden = true; });

    on('#langSelect', 'change', function () {
      save('lang', this.value);
      applyLang(this.value);
      if (toast) toast.hidden = true;
      if (me) pushAccountLang(this.value);
    });

    // 섹션 바로가기 (모든 페이지 공통)
    syncStick();
    initSecNav();
    initSecDrop();
    initCarousels();
    window.addEventListener('resize', syncStick);

    // 로그인 상태는 모든 페이지에서 확인합니다 (헤더 표시용)
    // 마이페이지는 로그인한 것이 확인된 뒤에야 내 정보를 부릅니다.
    loadMe().then(function () { if (me) loadAccount(); });

    // 묻고 답하기
    on('#boardForm', 'submit', function (e) {
      e.preventDefault();
      var text = $('#boardInput').value.trim();
      if (text.length < 5) { boardMsg('boardTooShort', 'bad'); return; }
      if (text.length > 1000) { boardMsg('boardTooLong', 'bad'); return; }
      var priv = $('#boardPrivate') ? $('#boardPrivate').checked : false;
      submitQuestion(text, priv);
    });
    on('#pagePrev', 'click', function () { if (boardPage > 1) renderBoard(boardPage - 1); });
    on('#pageNext', 'click', function () { if (boardPage < boardPages) renderBoard(boardPage + 1); });

    on('#boardSearch', 'submit', function (e) {
      e.preventDefault();
      boardQ = $('#boardQ').value.trim().slice(0, 60);
      renderBoard(1);
    });
    on('#boardQClear', 'click', function () {
      boardQ = '';
      if ($('#boardQ')) $('#boardQ').value = '';
      renderBoard(1);
    });

    // 로그인
    on('#loginForm', 'submit', function (e) {
      e.preventDefault();
      authSend('login', {
        username: $('#authId').value.trim(),
        password: $('#authPw').value
      }, 'authLoginOk', function () { location.href = 'board.html'; });
    });

    // 머리말 메뉴 — 바깥을 누르거나 Esc 를 누르면 닫힙니다.
    on('#menuLogout', 'click', function () { closeMenu(); logout(); });
    document.addEventListener('click', function (e) {
      var menu = $('#authMenu');
      if (!menu || menu.hidden) return;
      if (menu.contains(e.target)) return;
      closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    // 마이페이지
    on('#acLogout', 'click', function (e) { e.preventDefault(); logout(); });

    on('#nickForm', 'submit', function (e) {
      e.preventDefault();
      var v = $('#acNick').value.trim();
      if (v.length < 2 || v.length > 20) { acMsg('#nickMsg', 'errNickRule', 'bad'); return; }
      saveNick(v);
    });

    on('#pwForm', 'submit', function (e) {
      e.preventDefault();
      var now = $('#acPwNow').value;
      var next = $('#acPwNew').value, next2 = $('#acPwNew2').value;
      if (next !== next2) { acMsg('#pwMsg', 'errPwMatch', 'bad'); return; }
      if (next.length < 8) { acMsg('#pwMsg', 'errPwRule', 'bad'); return; }
      if (now === next) { acMsg('#pwMsg', 'errPwSame', 'bad'); return; }
      savePw(now, next);
    });

    // 오늘 이후 날짜는 생년월일로 고를 수 없게 막습니다.
    var acBirth = $('#acBirth');
    if (acBirth) acBirth.max = new Date().toISOString().slice(0, 10);

    on('#profileForm', 'submit', function (e) {
      e.preventDefault();
      var birth = $('#acBirth').value;
      var today = new Date().toISOString().slice(0, 10);
      if (birth && birth > today) { acMsg('#profileMsg', 'errBirthFuture', 'bad'); return; }
      saveProfile(birth, $('#acNation').value, $('#acGender').value);
    });

    // 소셜 로그인이 실패하면 콜백이 ?err=... 를 달고 이 화면으로 돌려보냅니다.
    // 주소창은 바로 정리해서, 새로고침해도 오류가 다시 뜨지 않게 합니다.
    if ($('#loginForm')) {
      var err = null;
      try { err = new URLSearchParams(location.search).get('err'); } catch (e2) {}
      if (err === 'oauth' || err === 'oauthOff') {
        authMsg(err === 'oauthOff' ? 'errOauthOff' : 'errOauth', 'bad');
        try { history.replaceState(null, '', location.pathname); } catch (e3) {}
      }
    }

    // 회원가입 — 비밀번호 확인은 보내기 전에 브라우저에서 먼저 거릅니다
    on('#signupForm', 'submit', function (e) {
      e.preventDefault();
      var pw = $('#authPw').value, pw2 = $('#authPw2').value;
      if (pw !== pw2) { authMsg('errPwMatch', 'bad'); return; }
      if (pw.length < 8) { authMsg('errPwRule', 'bad'); return; }
      authSend('signup', {
        username: $('#authId').value.trim(),
        password: pw,
        lang: lang            // 이 기기가 지금 쓰고 있는 언어를 함께 저장합니다
      }, 'authSignupOk', function () { location.href = 'board.html'; });
    });

    // 기한
    if ($('#ddayForm')) {
      $('#leaveDate').max = fmt(today());
      $('#applyDate').max = fmt(today());
      var savedLeave = load('leave'), savedApply = load('apply');
      if (savedLeave) {
        $('#leaveDate').value = savedLeave;
        if (savedApply) $('#applyDate').value = savedApply;
        calcDday();
      }
      on('#ddayForm', 'submit', function (e) { e.preventDefault(); calcDday(); });
      on('#ddayReset', 'click', function () {
        $('#ddayForm').reset();
        $('#ddayResult').hidden = true;
        drop('leave'); drop('apply');
      });
    }

    // 출국 정산
    if ($('#payForm')) {
      var savedExit = load('exit');
      if (savedExit) { $('#exitDate').value = savedExit; calcPay(); }
      on('#payForm', 'submit', function (e) { e.preventDefault(); calcPay(); });
      on('#payReset', 'click', function () {
        $('#payForm').reset();
        $('#payResult').hidden = true;
        drop('exit');
      });
    }

    // 출국만기보험 어림 계산 — 넣은 값은 이 기기에만 남깁니다(서버로 보내지 않습니다).
    if ($('#insForm')) {
      var sw = load('insWage'), ss = load('insStart'), se = load('insEnd');
      if (sw) $('#insWage').value = sw;
      if (ss) $('#insStart').value = ss;
      if (se) $('#insEnd').value = se;
      if (sw && ss) calcIns();

      on('#insForm', 'submit', function (e) {
        e.preventDefault();
        save('insWage', $('#insWage').value);
        save('insStart', $('#insStart').value);
        save('insEnd', $('#insEnd').value);
        calcIns();
      });
      on('#insReset', 'click', function () {
        $('#insForm').reset();
        $('#insResult').hidden = true;
        drop('insWage'); drop('insStart'); drop('insEnd');
      });
    }

    // 출국 정산 적격 판정
    if ($('#eligForm')) {
      var es = load('insStart'), ee = load('insEnd');
      if (es) $('#eligStart').value = es;
      if (ee) $('#eligEnd').value = ee;
      [['pyMoved', 'payMoved'], ['pyHours', 'payHours'],
       ['pyNat', 'payNat'], ['pyType', 'payType']].forEach(function (pair) {
        var v = load(pair[1]);
        if (!v) return;
        var n = document.querySelector('input[name="' + pair[0] + '"][value="' + v + '"]');
        if (n) n.checked = true;
      });

      // 두 카드의 날짜 칸을 서로 맞춰 둡니다 (같은 뜻이라 두 번 넣을 필요가 없습니다)
      mirrorDates('#eligStart', '#insStart', 'insStart');
      mirrorDates('#eligEnd', '#insEnd', 'insEnd');
      mirrorDates('#insStart', '#eligStart', 'insStart');
      mirrorDates('#insEnd', '#eligEnd', 'insEnd');

      // 입사일과 답이 모두 남아 있을 때만 지난 결과를 되살립니다
      if (es && load('payMoved')) calcElig();

      on('#eligForm', 'submit', function (e) { e.preventDefault(); calcElig(); });
      on('#eligReset', 'click', function () {
        $('#eligForm').reset();
        $('#eligResult').hidden = true;
        ['payMoved', 'payHours', 'payNat', 'payType'].forEach(function (k) { drop(k); });
      });
    }

    // 자가진단
    on('#quizForm', 'submit', function (e) {
      e.preventDefault();
      lastQuiz = {
        q1: $('input[name=q1]:checked').value,
        q2: $('input[name=q2]:checked').value,
        q3: $('input[name=q3]:checked').value
      };
      showQuizResult();
      $('#quizResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    on('#quizReset', 'click', function () {
      $('#quizForm').reset();
      lastQuiz = null;
      $('#quizResult').hidden = true;
      $('#docPreview').hidden = true;
      $('#docReadOut').hidden = true;
    });

    // 서류 미리보기 (기기 안에서만)
    on('#docFile', 'change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      $('#docImg').src = URL.createObjectURL(f);
      $('#docPreview').hidden = false;
      $('#docReadOut').hidden = true;
    });
    on('#docRead', 'click', readDoc);
    on('#docClear', 'click', function () {
      $('#docFile').value = '';
      $('#docPreview').hidden = true;
      $('#docReadOut').hidden = true;
    });

    // 질문
    on('#askForm', 'submit', function (e) {
      e.preventDefault();
      var q = $('#askInput').value.trim();
      if (!q) return;
      answer(q);
      $('#askInput').value = '';
    });

    /* 공지에서 "이 공지에 대해 질문하기" 를 눌러 넘어온 경우입니다.
       페이지가 갈라지면서 같은 화면 스크롤이 아니라 ask.html?q=... 이동이 됐습니다. */
    var carried = null;
    try { carried = new URLSearchParams(location.search).get('q'); } catch (e) {}
    if (!carried) { try { carried = sessionStorage.getItem('eum.carryQ'); } catch (e) {} }
    try { sessionStorage.removeItem('eum.carryQ'); } catch (e) {}
    if (carried && $('#askInput')) {
      carried = carried.slice(0, 600);
      $('#askInput').value = carried;
      setTimeout(function () { answer(carried); }, 300);
    }
  });
})();
