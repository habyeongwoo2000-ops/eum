/* /api/qna — 묻고 답하기 게시판

   GET  /api/qna?lang=vi
        공개된 글만 그 언어로 내보냅니다. 번역은 게시 때 이미 끝나 있어서
        이 경로는 AI를 부르지 않습니다. 조회는 몇 번이든 공짜입니다.
        주는 값 : { items: [{ id, title, body, answer, src, checked, publishedAt }] }

   POST /api/qna   { question: "...", lang: "vi" }
        질문을 접수합니다. 바로 공개되지 않습니다 —
        관리자가 식별 정보를 지우고 답변을 붙인 뒤에야 목록에 올라갑니다.
        접수 시 관리자가 읽을 한국어 번역을 1회 만들어 함께 저장합니다.
        주는 값 : { ok: true }
        사용자가 쓴 원문은 어떤 경로로도 브라우저에 다시 내려가지 않습니다. */

const { sb, toKorean, isLang, pickText, readBody } = require('./_qna');

const MIN_LEN = 5;
const MAX_LEN = 1000;
const PUBLIC_COLS = 'id,pub_title,pub_body,pub_answer,src,checked,published_at';

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') return await list(req, res);
    if (req.method === 'POST') return await submit(req, res);
    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'GET or POST only' });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'upstream failed' });
  }
};

async function list(req, res) {
  const lang = isLang(req.query && req.query.lang) ? req.query.lang : 'ko';

  const rows = await sb(
    'qna?status=eq.published&select=' + PUBLIC_COLS +
    '&order=published_at.desc&limit=50'
  ) || [];

  const items = rows.map(function (r) {
    return {
      id: r.id,
      title: pickText(r.pub_title, lang),
      body: pickText(r.pub_body, lang),
      answer: pickText(r.pub_answer, lang),
      src: r.src || null,
      checked: r.checked || null,
      publishedAt: r.published_at || null
    };
  }).filter(function (i) { return i.title && i.answer; });

  // 게시된 내용은 자주 바뀌지 않습니다. 짧게 캐시해 함수 호출을 줄입니다.
  res.setHeader('cache-control', 'public, max-age=60, stale-while-revalidate=600');
  return res.status(200).json({ items: items });
}

async function submit(req, res) {
  const body = readBody(req);
  const question = String(body.question || '').trim();
  const lang = isLang(body.lang) ? body.lang : 'en';

  if (question.length < MIN_LEN) return res.status(400).json({ error: 'question too short' });
  if (question.length > MAX_LEN) return res.status(413).json({ error: 'question too long' });

  /* 아주 단순한 폭주 방지입니다. 사용자별이 아니라 전체 기준이라
     정교하지 않지만, 스크립트가 표를 채우는 것은 막습니다.
     운영 단계로 가면 IP 또는 토큰 단위로 바꿔야 합니다. */
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const recent = await sb('qna?select=id&created_at=gte.' + encodeURIComponent(since) + '&limit=31');
  if (recent && recent.length > 30) {
    return res.status(429).json({ error: 'too many questions right now' });
  }

  /* 관리자가 읽을 한국어 번역. 실패해도 접수는 살립니다 —
     번역이 없으면 관리자가 원문을 보고 처리하면 됩니다. */
  let asked_body_ko = null;
  try {
    asked_body_ko = await toKorean(question, lang);
  } catch (e) {
    console.error('question translation failed', e);
  }

  await sb('qna', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      asked_lang: lang,
      asked_body: question,
      asked_body_ko: asked_body_ko,
      status: 'pending'
    })
  });

  // 접수 번호도 돌려주지 않습니다. 원문을 되읽을 수 있는 열쇠를 만들지 않기 위해서입니다.
  return res.status(201).json({ ok: true });
}
