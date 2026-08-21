/* POST /api/qna-publish — 관리자 전용. 답변을 번역해서 공개로 올립니다.

   쓰는 법
     1) Supabase 테이블 편집기에서 status='pending' 행의 asked_body_ko 를 읽습니다.
     2) draft_title_ko / draft_body_ko / draft_answer_ko / src / checked 를 채웁니다.
        draft_body_ko 는 반드시 익명화하세요 (회사명·정확한 날짜·지역·이름 제거).
     3) status 를 'ready' 로 바꿉니다.
     4) 이 엔드포인트를 부릅니다.

        curl -X POST https://<도메인>/api/qna-publish -H "x-admin-token: <ADMIN_TOKEN>"

        특정 글만: -H "content-type: application/json" -d '{"id":"<uuid>"}'

   한 번에 3건까지 처리합니다 (서버리스 실행 시간 제한 때문). 남으면 또 부르면 됩니다.
   번역은 글 하나당 1회입니다. 이후 조회는 AI를 부르지 않습니다. */

const crypto = require('crypto');
const { sb, translateBundle, readBody } = require('./_qna');

const BATCH = 3;
const DRAFT_COLS = 'id,draft_title_ko,draft_body_ko,draft_answer_ko,src,checked';

function tokenOk(given) {
  const want = process.env.ADMIN_TOKEN || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given), 'utf8');
  const b = Buffer.from(want, 'utf8');
  if (a.length !== b.length) return false;       // 길이는 먼저 비교해야 timingSafeEqual 이 던지지 않습니다
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  if (!process.env.ADMIN_TOKEN) {
    console.error('ADMIN_TOKEN not set — refusing to run');
    return res.status(500).json({ error: 'not configured' });
  }
  if (!tokenOk(req.headers['x-admin-token'])) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const only = String(readBody(req).id || '').trim();
    let query = 'qna?status=eq.ready&select=' + DRAFT_COLS + '&order=created_at&limit=' + BATCH;
    if (only) {
      if (!/^[0-9a-f-]{36}$/i.test(only)) return res.status(400).json({ error: 'bad id' });
      query = 'qna?status=eq.ready&id=eq.' + only + '&select=' + DRAFT_COLS;
    }

    const rows = await sb(query) || [];
    if (!rows.length) return res.status(200).json({ published: [], skipped: [], note: 'nothing ready' });

    const published = [];
    const skipped = [];

    for (const row of rows) {
      const title = (row.draft_title_ko || '').trim();
      const bodyKo = (row.draft_body_ko || '').trim();
      const answer = (row.draft_answer_ko || '').trim();
      const src = (row.src || '').trim();

      /* 근거 없는 답변은 올리지 않습니다. 이 서비스의 원칙을 코드에서도 지킵니다.
         근거를 댈 수 없는 질문은 답변에 1345 안내를 넣고 src 에 그 출처를 적으세요. */
      const missing = [];
      if (!title) missing.push('draft_title_ko');
      if (!bodyKo) missing.push('draft_body_ko');
      if (!answer) missing.push('draft_answer_ko');
      if (!src) missing.push('src');
      if (missing.length) {
        skipped.push({ id: row.id, reason: 'missing: ' + missing.join(', ') });
        continue;
      }

      try {
        const t = await translateBundle({ title: title, body: bodyKo, answer: answer });

        await sb('qna?id=eq.' + row.id, {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({
            pub_title: t.title,
            pub_body: t.body,
            pub_answer: t.answer,
            status: 'published',
            published_at: new Date().toISOString()
          })
        });

        published.push(row.id);
      } catch (e) {
        // 한 건이 실패해도 나머지는 계속 처리합니다. 실패한 건은 'ready' 로 남습니다.
        console.error('publish failed for ' + row.id, e);
        skipped.push({ id: row.id, reason: 'translation or write failed' });
      }
    }

    return res.status(200).json({ published: published, skipped: skipped });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'upstream failed' });
  }
};
