/* 공개 게시판 — 목록 보기(누구나) / 글쓰기(로그인한 사람만) / 답변 달기(관리자만)

   GET  /api/posts?page=1&lang=ko                              → { items, page, pages, total }
   POST /api/posts { body, lang, private }                     → 글 등록. 쿠키로 로그인 확인.
   POST /api/posts { action:'answer', id, answer, src }         → 답변 저장. 관리자만.

   비공개 글에 대해
   글쓴이가 "비공개로 남기기"를 고르면 그 글은 글쓴이 본인과 관리자만 볼 수
   있습니다. 목록을 만드는 시점에 걸러내므로, 다른 사람 화면에는 존재 자체가
   나타나지 않습니다.

   번역 비용에 대해
   글을 올리는 순간, 그리고 답변을 저장하는 순간 딱 한 번씩만 5개 언어로
   번역해 저장합니다. 목록을 아무리 많이 열어도 번역은 다시 돌지 않습니다.
   번역이 실패해도 글/답변은 원문으로 남습니다. */

const { sb, sbRange, readBody } = require('./_db');
const A = require('./_auth');
const { translateBundle, isLang, pickText } = require('./_qna');

const PER_PAGE = 10;
const COLS = 'id,created_at,user_id,username,orig_lang,orig_body,body,answer,src,checked,is_private';

function fail(res, code, key) {
  return res.status(code).json({ ok: false, error: key });
}

module.exports = async function handler(req, res) {
  try {
    /* ---------- 목록 ---------- */
    if (req.method === 'GET') {
      const q = req.query || {};
      const lang = isLang(q.lang) ? q.lang : 'ko';
      let page = parseInt(q.page, 10);
      if (!Number.isFinite(page) || page < 1) page = 1;

      const from = (page - 1) * PER_PAGE;
      const me = A.currentUser(req);

      // 비공개 글은 글쓴이 본인과 관리자에게만 보입니다. 목록을 만드는
      // 이 시점에 걸러내므로, 다른 사람 화면에는 아예 나타나지 않습니다.
      let filter = '&is_private=eq.false';
      if (me && me.isAdmin) {
        filter = '';                                            // 관리자는 전부 봅니다
      } else if (me) {
        filter = '&or=(is_private.eq.false,user_id.eq.' + encodeURIComponent(me.uid) + ')';
      }

      const got = await sbRange(
        'eum_posts?select=' + COLS + filter + '&order=created_at.desc', from, from + PER_PAGE - 1);

      const items = (got.rows || []).map(function (r) {
        return {
          id: r.id,
          at: r.created_at,
          username: r.username,
          origLang: r.orig_lang,
          body: pickText(r.body, lang) || r.orig_body || '',
          answer: r.answer ? pickText(r.answer, lang) : '',
          src: r.src || '',
          checked: r.checked || '',
          isPrivate: !!r.is_private,
          mine: !!(me && me.uid === r.user_id)
        };
      });

      const pages = Math.max(1, Math.ceil((got.total || 0) / PER_PAGE));
      return res.status(200).json({
        items: items, page: page, pages: pages, total: got.total || 0, perPage: PER_PAGE,
        isAdmin: !!(me && me.isAdmin)
      });
    }

    if (req.method !== 'POST') return fail(res, 405, 'errNet');

    const input = readBody(req);
    const action = String(input.action || 'create');

    /* ---------- 답변 달기 (관리자만) ---------- */
    if (action === 'answer') {
      const me = A.currentUser(req);
      if (!me) return fail(res, 401, 'errNeedLogin');
      if (!me.isAdmin) return fail(res, 403, 'errAdminOnly');

      const id = String(input.id || '');
      if (!id) return fail(res, 400, 'errNet');

      const text = String(input.answer || '').trim();
      if (text.length < 5 || text.length > 2000) return fail(res, 400, 'errAnswerRule');

      const src = String(input.src || '').trim();

      let bundle = null;
      try {
        const t = await translateBundle({ title: '', body: '', answer: text });
        bundle = t && t.answer ? t.answer : null;
      } catch (e) {
        console.warn('answer translate failed', e && e.message);
      }
      if (!bundle) { bundle = { ko: text }; }

      const checked = new Date().toISOString().slice(0, 10);

      const rows = await sb('eum_posts?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ answer: bundle, src: src || null, checked: checked })
      });
      const row = rows && rows[0];
      if (!row) return fail(res, 404, 'errNet');

      return res.status(200).json({ ok: true, checked: checked });
    }

    /* ---------- 글쓰기 ---------- */
    const me = A.currentUser(req);
    if (!me) return fail(res, 401, 'errNeedLogin');

    const text = String(input.body || '').trim();
    const lang = isLang(input.lang) ? input.lang : 'ko';
    const isPrivate = input.private === true || input.private === 'true';

    if (text.length < 5) return fail(res, 400, 'boardTooShort');
    if (text.length > 1000) return fail(res, 400, 'boardTooLong');

    // 번역은 있으면 좋은 것이지, 글이 올라가는 조건은 아닙니다.
    let bundle = null;
    try {
      const t = await translateBundle({ title: '', body: text, answer: '' });
      bundle = t && t.body ? t.body : null;
      // 원문 언어 자리에는 사용자가 쓴 글자를 그대로 둡니다.
      if (bundle) bundle[lang] = text;
    } catch (e) {
      console.warn('post translate failed', e && e.message);
    }
    if (!bundle) { bundle = {}; bundle[lang] = text; }

    await sb('eum_posts', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: me.uid,
        username: me.username,
        orig_lang: lang,
        orig_body: text,
        body: bundle,
        is_private: isPrivate
      })
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('posts error', e && e.message);
    return fail(res, 500, 'errNet');
  }
};
