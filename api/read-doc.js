/* POST /api/read-doc
   받는 값 : { image: "<base64, 헤더 없음>", mediaType: "image/jpeg", lang: "ko" }
   주는 값 : { docType, endDate, employer, statedReason, reasonCategory, note }

   Google Gemini API 무료 등급을 사용합니다. 키는 _gemini.js 가 여러 개를
   돌려 씁니다 (GEMINI_API_KEY, GEMINI_API_KEY_2 ...).
   AI는 사진에서 사실만 뽑습니다. 법정 사유 해당 여부 판단은 하지 않습니다.
   판단은 브라우저의 규칙 엔진(자가진단 3문항)이 합니다. */

const { LANG_NAME } = require('./_kb');

const G = require('./_gemini');

const MODEL = 'gemini-flash-latest';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const CATEGORIES = ['wage', 'abuse', 'terms', 'closed', 'own', 'unknown'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  if (!G.keyCount()) {
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

    /* 사진 판독도 같은 키 묶음을 씁니다. 한 키가 막히면 다음 키로 넘어갑니다. */
    const call = await G.generate({
      system_instruction: { parts: [{ text: system }] },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: mediaType, data: image } },
          { text: 'Extract the fields as JSON.' }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 3000,
        temperature: 0,
        responseMimeType: 'application/json'
      }
    }, { model: MODEL });

    if (!call.ok) {
      const busy = call.reason === 'busy' || call.reason === 'quota';
      return res.status(busy ? 503 : 502).json({
        error: busy ? 'upstream busy' : 'upstream failed',
        retryable: busy
      });
    }

    const raw = G.textOf(call.data).replace(/```json|```/g, '').trim();

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
