/* E9-Bridge — 화면 동작
   서버 없이 브라우저에서만 돕니다. 입력한 값은 이 기기의 localStorage 에만 남습니다. */

(function () {
  'use strict';

  var STORE = 'eum.';
  var lang = 'ko';
  var T = I18N.ko;

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

  // I18N 에 실제로 있는 키만 통과시킵니다. ?lang=constructor 같은 입력도 여기서 막힙니다.
  function isLang(code) {
    return typeof code === 'string' && Object.prototype.hasOwnProperty.call(I18N, code);
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
    lang = isLang(code) ? code : 'en';
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
    renderChips();
    renderPayList();
    renderBoard();
    boardMsg(boardMsgKey, boardMsgKind); // 안내 문구도 새 언어로 다시 씁니다
    authMsg(authMsgKey, authMsgKind);
    paintAuth();
    paintPager();
    syncStick();                         // 라벨 길이가 바뀌면 헤더 높이도 바뀝니다
    if (shown('#payResult')) calcPay();
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

  /* ---------- 공지 ---------- */
  function renderNotices() {
    var list = $('#noticeList');
    if (!list) return;
    list.innerHTML = '';
    NOTICES.forEach(function (n) {
      var body = n[lang] || n.en;
      var art = el('article', 'notice');

      var head = el('button', 'notice-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', 'false');
      var tagLabel = (T.noticeTags && T.noticeTags[n.tagKey]) || n.tagKey;
      head.appendChild(el('span', 'notice-tag', tagLabel));
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

  /* 글 한 장. 답변이 아직 없을 수도 있습니다. */
  function boardCard(it) {
    var art = el('article', 'board-item');

    var head = el('div', 'board-head');
    head.appendChild(el('span', 'board-user', it.username || '—'));
    if (it.at) head.appendChild(el('span', 'board-at', String(it.at).slice(0, 10)));
    art.appendChild(head);

    art.appendChild(el('p', 'board-body', it.body || ''));

    if (it.answer) {
      var a = el('div', 'board-a');
      a.appendChild(el('span', 'board-a-label', T.boardAnswer));
      a.appendChild(el('span', null, it.answer));
      art.appendChild(a);
      if (it.src || it.checked) {
        var meta = el('div', 'board-meta');
        if (it.src) meta.appendChild(el('span', null, T.ntSourceLabel + ': ' + it.src));
        if (it.checked) meta.appendChild(el('span', null, T.ntCheckedLabel + ': ' + it.checked));
        art.appendChild(meta);
      }
    } else {
      art.appendChild(el('p', 'board-pending', T.boardNoAnswerYet));
    }
    return art;
  }

  /* 쪽 넘김. 한 쪽에 10개씩 서버가 잘라 보냅니다. */
  var boardPage = 1, boardPages = 1;

  function paintPager() {
    var nav = $('#boardPager');
    if (!nav) return;
    nav.hidden = boardPages <= 1;
    $('#pageNow').textContent = boardPage + ' ' + (T.boardPageOf || '/') + ' ' + boardPages;
    $('#pagePrev').disabled = boardPage <= 1;
    $('#pageNext').disabled = boardPage >= boardPages;
  }

  function renderBoard(page) {
    var list = $('#boardList');
    if (!list) return;
    if (page) boardPage = page;
    var seq = ++boardSeq;

    fetch('api/posts?page=' + boardPage + '&lang=' + encodeURIComponent(lang),
      { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
      .then(function (data) {
        if (seq !== boardSeq) return;
        var items = (data && data.items) || [];
        boardPage = (data && data.page) || 1;
        boardPages = (data && data.pages) || 1;
        list.innerHTML = '';
        if (!items.length) list.appendChild(el('p', 'board-empty', T.boardEmpty));
        else items.forEach(function (it) { list.appendChild(boardCard(it)); });
        paintPager();
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

  function submitQuestion(text) {
    var btn = $('#boardSend');
    btn.disabled = true;
    boardMsg('boardSending');

    fetch('api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: text, lang: lang })
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

  function paintAuth() {
    var slot = $('#authSlot');
    if (slot) {
      slot.innerHTML = '';
      if (me) {
        slot.appendChild(el('span', 'auth-who', me.username + (T.authHello || '')));
        var out = el('button', 'auth-btn', T.navLogout);
        out.type = 'button';
        out.addEventListener('click', logout);
        slot.appendChild(out);
      } else {
        var a = el('a', 'auth-btn', T.navLogin);
        a.href = 'login.html';
        slot.appendChild(a);
      }
    }
    // 게시판: 로그인했으면 글쓰기 상자, 아니면 안내
    var form = $('#boardForm'), gate = $('#boardGate');
    if (form && gate) { form.hidden = !me; gate.hidden = !!me; }
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
      .then(function () { paintAuth(); paintSocial(); });
  }

  function logout() {
    fetch('api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    })
      .catch(function () {})
      .then(function () { setUser(null); paintAuth(); });
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
      if (!r.ok) throw new Error('http ' + r.status);
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
      .catch(function () {
        // 서버가 없거나 실패하면 브라우저 안의 지식베이스로 답합니다.
        var hit = findEntry(question);
        if (hit) fillAnswer(box, hit[lang] || hit.en, hit.src, true, hit.review);
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
    Array.prototype.forEach.call(nav.querySelectorAll('a[href]'), function (a) {
      var on = fileOf(a.getAttribute('href')) === here;
      a.classList.toggle('is-on', on);
      if (on) { a.setAttribute('aria-current', 'page'); keepInView(a); }
      else { a.removeAttribute('aria-current'); }
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
    });

    // 섹션 바로가기 (모든 페이지 공통)
    syncStick();
    initSecNav();
    window.addEventListener('resize', syncStick);

    // 로그인 상태는 모든 페이지에서 확인합니다 (헤더 표시용)
    loadMe();

    // 묻고 답하기
    on('#boardForm', 'submit', function (e) {
      e.preventDefault();
      var text = $('#boardInput').value.trim();
      if (text.length < 5) { boardMsg('boardTooShort', 'bad'); return; }
      if (text.length > 1000) { boardMsg('boardTooLong', 'bad'); return; }
      submitQuestion(text);
    });
    on('#pagePrev', 'click', function () { if (boardPage > 1) renderBoard(boardPage - 1); });
    on('#pageNext', 'click', function () { if (boardPage < boardPages) renderBoard(boardPage + 1); });

    // 로그인
    on('#loginForm', 'submit', function (e) {
      e.preventDefault();
      authSend('login', {
        username: $('#authId').value.trim(),
        password: $('#authPw').value
      }, 'authLoginOk', function () { location.href = 'board.html'; });
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
        password: pw
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
