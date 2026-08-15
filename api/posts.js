/* 공개 게시판 — 목록 보기(누구나) / 글쓰기(로그인한 사람만)

   GET  /api/posts?page=1&lang=ko   → { items, page, pages, total }
   POST /api/posts { body, lang }   → 글 등록. 쿠키로 로그인 확인.

   번역 비용에 대해
   글을 올리는 순간 한 번만 5개 언어로 번역해 저장합니다. 목록을 아무리 많이
   열어도 번역은 다시 돌지 않습니다. 번역이 실패해도 글은 원문으로 남습니다. */

const { sb, sbRange, readBody } = require('./_db');
const A = require('./_auth');
const { translateBundle, isLang, pickText } = require('./_qna');

const PER_PAGE = 10;
const COLS = 'id,created_at,username,orig_lang,orig_body,body,answer,src,checked';

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
      const got = await sbRange(
        'eum_posts?select=' + COLS + '&order=created_at.desc', from, from + PER_PAGE - 1);

      const items = (got.rows || []).map(function (r) {
        return {
          id: r.id,
          at: r.created_at,
          username: r.username,
          origLang: r.orig_lang,
          body: pickText(r.body, lang) || r.orig_body || '',
          answer: r.answer ? pickText(r.answer, lang) : '',
          src: r.src || '',
          checked: r.checked || ''
        };
      });

      const pages = Math.max(1, Math.ceil((got.total || 0) / PER_PAGE));
      return res.status(200).json({
        items: items, page: page, pages: pages, total: got.total || 0, perPage: PER_PAGE
      });
    }

    /* ---------- 글쓰기 ---------- */
    if (req.method !== 'POST') return fail(res, 405, 'errNet');

    const me = A.currentUser(req);
    if (!me) return fail(res, 401, 'errNeedLogin');

    const input = readBody(req);
    const text = String(input.body || '').trim();
    const lang = isLang(input.lang) ? input.lang : 'ko';

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
        body: bundle
      })
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('posts error', e && e.message);
    return fail(res, 500, 'errNet');
  }
};
