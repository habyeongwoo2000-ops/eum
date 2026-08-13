/* POST /api/read-doc
   받는 값 : { image: "<base64, 헤더 없음>", mediaType: "image/jpeg", lang: "ko" }
   주는 값 : { docType, endDate, employer, statedReason, reasonCategory, note }

   Google Gemini API 무료 등급을 사용합니다. 환경변수 이름: GEMINI_API_KEY
   AI는 사진에서 사실만 뽑습니다. 법정 사유 해당 여부 판단은 하지 않습니다.
   판단은 브라우저의 규칙 엔진(자가진단 3문항)이 합니다. */

const { LANG_NAME } = require('./_kb');

const MODEL = 'gemini-flash-latest';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const CATEGORIES = ['wage', 'abuse', 'terms', 'closed', 'own', 'unknown'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const image = String(body.image || '');
    const mediaType = ALLOWED.indexOf(body.mediaType) !== -1 ? body.mediaType : 'image/jpeg';
    const lang = LANG_NAME[body.lang] ? body.lang : 'en';

    if (!image) return res.status(400).json({ error: 'image required' });
    if (image.length > 5000000) return res.status(413).json({ error: 'image too large' });

    const system = `You read photographs of Korean employment documents and extract facts. You do not give legal opinions.

Return ONE JSON object with exactly these keys:
  docType        - short label for what this document is, written in ${LANG_NAME[lang]}
  employer       - company name as printed, or null
  endDate        - "YYYY-MM-DD" if a contract end date or last working day is printed, else null
  startDate      - "YYYY-MM-DD" if a contract start date is printed, else null
  statedReason   - the reason for termination exactly as written, translated into ${LANG_NAME[lang]}, or null
  reasonCategory - one of: wage, abuse, terms, closed, own, unknown
  note           - one short sentence in ${LANG_NAME[lang]} about anything unclear or unreadable, or null

reasonCategory guide — pick from the document's own wording only:
  wage    = unpaid or delayed wages
  abuse   = violence, verbal abuse, sexual harassment
  terms   = actual work, housing or conditions differ from the contract
  closed  = business suspended, closed, or out of work
  own     = the worker resigned by choice, or the contract simply expired
  unknown = the document does not say, or you cannot read it

Rules:
- Never guess a date. If it is blurry or absent, use null.
- Never write that the worker does or does not qualify for a workplace change. That is not your job.
- If the photo is not an employment document, set docType to a short description and everything else to null with reasonCategory "unknown".`;

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      MODEL + ':generateContent?key=' + encodeURIComponent(key);

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: mediaType, data: image } },
            { text: 'Extract the fields as JSON.' }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 900,
          temperature: 0,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('gemini error', r.status, detail);
      return res.status(502).json({ error: 'upstream failed' });
    }

    const data = await r.json();
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const raw = parts.map(function (p) { return p.text || ''; }).join('')
      .replace(/```json|```/g, '').trim();

    let out;
    try {
      out = JSON.parse(raw);
    } catch (e) {
      console.error('parse failed', raw.slice(0, 300));
      return res.status(502).json({ error: 'could not parse' });
    }

    // 값 다듬기 — 모델이 이상한 걸 보내도 화면이 깨지지 않게
    const isDate = function (v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); };
    return res.status(200).json({
      docType: out.docType || null,
      employer: out.employer || null,
      endDate: isDate(out.endDate) ? out.endDate : null,
      startDate: isDate(out.startDate) ? out.startDate : null,
      statedReason: out.statedReason || null,
      reasonCategory: CATEGORIES.indexOf(out.reasonCategory) !== -1 ? out.reasonCategory : 'unknown',
      note: out.note || null
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
