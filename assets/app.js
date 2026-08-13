/* 이음 — 화면 동작
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
  function detect() {
    var stored = load('lang');
    if (stored && I18N[stored]) return { code: stored, auto: false };
    var list = navigator.languages || [navigator.language || 'ko'];
    for (var i = 0; i < list.length; i++) {
      var base = String(list[i]).toLowerCase().split('-')[0];
      if (I18N[base]) return { code: base, auto: true };
      if (base === 'in') return { code: 'id', auto: true }; // 구형 인도네시아어 코드
    }
    return { code: 'en', auto: true }; // 지원하지 않는 언어는 영어로
  }

  function applyLang(code) {
    lang = I18N[code] ? code : 'en';
    T = I18N[lang];
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(function (n) {
      var v = T[n.getAttribute('data-i18n')];
      if (typeof v === 'string') n.textContent = v;
    });
    $$('[data-i18n-ph]').forEach(function (n) {
      var v = T[n.getAttribute('data-i18n-ph')];
      if (typeof v === 'string') n.placeholder = v;
    });
    $('#langSelect').value = lang;
    renderNotices();
    renderChips();
    renderPayList();
    if (!$('#payResult').hidden) calcPay();
    if (!$('#ddayResult').hidden) calcDday();
    if (!$('#quizResult').hidden) showQuizResult();
    clearThread();
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
    var leaveV = $('#leaveDate').value;
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
    $('#applyDateOut').textContent = fmt(applyDue);
    $('#jobDateOut').textContent = fmt(jobDue);
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
    var v = $('#exitDate').value;
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
    $('#reportDateOut').textContent = fmt(reportDue);
    $('#claimDateOut').textContent = fmt(claimDue);

    var msg = $('#payMsg');
    if (claimDays < 0) { msg.className = 'callout is-stop'; msg.textContent = T.pyMsgOver; }
    else if (claimDays <= 7 || reportDays < 0) { msg.className = 'callout is-warn'; msg.textContent = T.pyMsgWarn; }
    else { msg.className = 'callout'; msg.textContent = T.pyMsgOk; }
  }

  /* ---------- 공지 ---------- */
  function renderNotices() {
    var list = $('#noticeList');
    list.innerHTML = '';
    NOTICES.forEach(function (n) {
      var body = n[lang] || n.en;
      var art = el('article', 'notice');

      var head = el('button', 'notice-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', 'false');
      head.appendChild(el('span', 'notice-tag', n.tag));
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

      var ask = el('button', 'btn btn-ghost btn-sm', T.ntAskBtn);
      ask.type = 'button';
      ask.addEventListener('click', function () {
        $('#askInput').value = body.title;
        document.getElementById('ask').scrollIntoView({ behavior: 'smooth' });
        setTimeout(function () { answer(body.title); }, 350);
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

  /* ---------- 질문 답변 ---------- */
  function renderChips() {
    var box = $('#askChips');
    box.innerHTML = '';
    (T.chips || []).forEach(function (c) {
      var b = el('button', 'chip', c);
      b.type = 'button';
      b.addEventListener('click', function () { $('#askInput').value = c; answer(c); });
      box.appendChild(b);
    });
  }

  function clearThread() { $('#thread').innerHTML = ''; }

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

  function answer(question) {
    var thread = $('#thread');
    thread.appendChild(el('div', 'bubble bubble-u', question));

    var hit = findEntry(question);
    var box = el('div', 'bubble bubble-a');

    if (hit && hit.review) box.appendChild(el('span', 'flag', T.askReview));

    if (hit) {
      box.appendChild(el('p', null, hit[lang] || hit.en));
      box.appendChild(el('p', 'bubble-src', T.askSourceLabel + ': ' + hit.src));
    } else {
      box.appendChild(el('p', null, T.askFallback));
    }
    box.appendChild(el('p', 'bubble-dis', T.disclaimer));

    thread.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var d = detect();
    applyLang(d.code);

    if (d.auto && d.code !== 'ko') {
      var toast = $('#langToast');
      toast.hidden = false;
      setTimeout(function () { toast.hidden = true; }, 7000);
    }
    $('#toastClose').addEventListener('click', function () { $('#langToast').hidden = true; });

    $('#langSelect').addEventListener('change', function () {
      save('lang', this.value);
      applyLang(this.value);
      $('#langToast').hidden = true;
    });

    // 기한
    $('#leaveDate').max = fmt(today());
    $('#applyDate').max = fmt(today());
    var savedLeave = load('leave'), savedApply = load('apply');
    if (savedLeave) {
      $('#leaveDate').value = savedLeave;
      if (savedApply) $('#applyDate').value = savedApply;
      calcDday();
    }
    $('#ddayForm').addEventListener('submit', function (e) { e.preventDefault(); calcDday(); });
    $('#ddayReset').addEventListener('click', function () {
      $('#ddayForm').reset();
      $('#ddayResult').hidden = true;
      drop('leave'); drop('apply');
    });

    // 출국 정산
    var savedExit = load('exit');
    if (savedExit) { $('#exitDate').value = savedExit; calcPay(); }
    $('#payForm').addEventListener('submit', function (e) { e.preventDefault(); calcPay(); });
    $('#payReset').addEventListener('click', function () {
      $('#payForm').reset();
      $('#payResult').hidden = true;
      drop('exit');
    });

    // 자가진단
    $('#quizForm').addEventListener('submit', function (e) {
      e.preventDefault();
      lastQuiz = {
        q1: $('input[name=q1]:checked').value,
        q2: $('input[name=q2]:checked').value,
        q3: $('input[name=q3]:checked').value
      };
      showQuizResult();
      $('#quizResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    $('#quizReset').addEventListener('click', function () {
      $('#quizForm').reset();
      lastQuiz = null;
      $('#quizResult').hidden = true;
      $('#docPreview').hidden = true;
    });

    // 서류 미리보기 (기기 안에서만)
    $('#docFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      $('#docImg').src = URL.createObjectURL(f);
      $('#docPreview').hidden = false;
    });
    $('#docClear').addEventListener('click', function () {
      $('#docFile').value = '';
      $('#docPreview').hidden = true;
    });

    // 질문
    $('#askForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = $('#askInput').value.trim();
      if (!q) return;
      answer(q);
      $('#askInput').value = '';
    });
  });
})();
