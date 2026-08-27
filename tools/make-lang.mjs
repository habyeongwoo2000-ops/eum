/* 언어 파일 만들기 — 한국어 원본을 새 언어로 옮겨 파일로 저장합니다.
   ────────────────────────────────────────────────────────────────
   왜 스크립트인가
     UI 문자열 503개 + 콘텐츠 112개 = 언어 하나에 615문장입니다.
     5개 언어를 늘리면 3,075문장. 손으로 옮겨 적을 분량이 아니고,
     사람이 한 번에 옮기면 키를 빠뜨립니다. 빠진 키는 그 언어 사용자에게
     빈칸으로 보입니다.

   쓰는 법 (프로젝트 폴더에서)
     GEMINI_API_KEY=... node tools/make-lang.mjs km
     GEMINI_API_KEY=... node tools/make-lang.mjs km ne my si uz
     (GEMINI_API_KEY_2 ~ _5 도 함께 넣어 두면 한도가 찰 때 자동으로 넘어갑니다)

   만든 뒤 할 일
     1) node tools/check-lang.mjs        키가 빠지지 않았는지 확인
     2) assets/i18n/core.js 의 EUM_LANGS 에 코드 추가   ← 이걸 해야 화면에 뜹니다
     3) 사람이 검수. 특히 기한·횟수·전화번호가 그대로인지 확인

   ⚠ 이 스크립트가 만든 것은 기계 번역 초안입니다. 이 서비스는 기한을 하루
     잘못 알려주면 그 사람이 출국 대상이 됩니다. 검수 전에는 EUM_LANGS 에
     넣지 마세요.
*/

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'assets', 'i18n');
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

/* 이 서비스에서 쓰는 언어 이름 — 프롬프트에 정확히 적어 줘야 엉뚱한 방언이 안 나옵니다. */
const NAME = {
  km: 'Khmer (Cambodia)', ne: 'Nepali', my: 'Burmese (Myanmar)',
  si: 'Sinhala (Sri Lanka)', uz: 'Uzbek (Latin script)', mn: 'Mongolian (Cyrillic)',
  bn: 'Bengali', zh: 'Simplified Chinese', tl: 'Tagalog (Filipino)',
  vi: 'Vietnamese', th: 'Thai', id: 'Indonesian', en: 'English'
};

function keys() {
  const out = [];
  const push = (v) => { const k = String(v || '').trim(); if (k && !out.includes(k)) out.push(k); };
  push(process.env.GEMINI_API_KEY);
  for (let i = 2; i <= 10; i++) push(process.env['GEMINI_API_KEY_' + i]);
  String(process.env.GEMINI_API_KEYS || '').split(',').forEach(push);
  return out;
}

const KEYS = keys();
if (!KEYS.length) {
  console.error('GEMINI_API_KEY 가 없습니다. 환경변수로 넣어 주세요.');
  process.exit(1);
}
let cursor = 0;

async function ask(system, user) {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 8000, responseMimeType: 'application/json' }
  });

  // 키를 돌려 씁니다. 한도(429)면 기다리지 않고 다음 키로 넘어갑니다.
  for (let n = 0; n < KEYS.length * 2; n++) {
    const key = KEYS[cursor++ % KEYS.length];
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL +
      ':generateContent?key=' + encodeURIComponent(key),
      { method: 'POST', headers: { 'content-type': 'application/json' }, body });

    if (r.ok) {
      const d = await r.json();
      const parts = ((d.candidates || [])[0] || {}).content?.parts || [];
      return parts.map((p) => p.text || '').join('').replace(/```json|```/g, '').trim();
    }
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 300)); continue; }
    if (r.status >= 500) { await new Promise((s) => setTimeout(s, 1200)); continue; }
    throw new Error('gemini ' + r.status + ' ' + (await r.text()).slice(0, 200));
  }
  throw new Error('모든 키의 한도가 찼습니다. 잠시 뒤 다시 실행하세요.');
}

/* 중첩된 객체·배열 안의 문자열만 뽑아 번호를 붙입니다.
   구조를 그대로 두고 값만 갈아 끼워야 키가 어긋나지 않습니다. */
function collect(node, out, trail) {
  if (typeof node === 'string') { out.push({ path: trail.slice(), text: node }); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => collect(v, out, trail.concat(i))); return; }
  if (node && typeof node === 'object') {
    Object.keys(node).forEach((k) => collect(node[k], out, trail.concat(k)));
  }
}

function setAt(root, trail, value) {
  let cur = root;
  for (let i = 0; i < trail.length - 1; i++) cur = cur[trail[i]];
  cur[trail[trail.length - 1]] = value;
}

const SYSTEM = (lang) => `You translate UI text for a public-interest website that helps migrant workers in South Korea (E-9 Employment Permit System) understand their workplace-change deadlines and money they are owed.

Translate from Korean into ${lang}.

Hard rules:
- Keep every number, date, percentage and phone number EXACTLY as in the source (1345, 1350, 1355, 1600-0266, 10,320, 8.3%, 4년 10개월 → the numerals stay).
- Keep placeholders such as {d} {y} {a} {n} exactly, including the braces.
- Keep Korean institution names recognisable; you may add a short translation in parentheses once.
- Plain, short sentences. The readers are not lawyers and often read slowly. Prefer everyday words over legal jargon.
- Never add advice, warnings or content that is not in the source.
- Return ONLY a JSON array of translated strings, same length and same order as the input array.`;

async function translateAll(items, lang, label) {
  const out = new Array(items.length);
  const SIZE = 40;                      // 한 번에 40문장씩. 크게 잡으면 응답이 잘립니다.
  for (let i = 0; i < items.length; i += SIZE) {
    const chunk = items.slice(i, i + SIZE);
    const res = await ask(SYSTEM(NAME[lang] || lang),
      JSON.stringify(chunk.map((c) => c.text)));
    let arr;
    try { arr = JSON.parse(res); } catch (e) { throw new Error('JSON 파싱 실패: ' + res.slice(0, 200)); }
    if (!Array.isArray(arr) || arr.length !== chunk.length) {
      throw new Error(`개수가 안 맞습니다 (보낸 것 ${chunk.length}, 받은 것 ${arr && arr.length})`);
    }
    arr.forEach((t, j) => { out[i + j] = String(t); });
    process.stdout.write(`\r  ${label} ${Math.min(i + SIZE, items.length)}/${items.length}`);
  }
  process.stdout.write('\n');
  return out;
}

/* ko.js 를 읽어 객체로 만듭니다. 공용 상수는 core.js 에 있으므로 흉내만 냅니다. */
function loadKo() {
  const src = fs.readFileSync(path.join(DIR, 'ko.js'), 'utf8');
  const sandbox = {
    CHECKED_ON: '@@CHECKED_ON@@', PAY_CHECKED: '@@PAY_CHECKED@@',
    LEGAL_CHECKED: '@@LEGAL_CHECKED@@', PAY_SRC: '@@PAY_SRC@@', I18N: {}
  };
  const fn = new Function('CHECKED_ON', 'PAY_CHECKED', 'LEGAL_CHECKED', 'PAY_SRC', 'I18N',
    src + '; return I18N.ko;');
  return fn(sandbox.CHECKED_ON, sandbox.PAY_CHECKED, sandbox.LEGAL_CHECKED, sandbox.PAY_SRC, sandbox.I18N);
}

function dump(lang, obj) {
  /* 상수 자리표시자(@@CHECKED_ON@@)를 다시 변수 참조로 되돌립니다.
     문장 한가운데 박혀 있는 경우도 있어서( '확인일: ' + CHECKED_ON ),
     문자열 전체를 훑어 이어 붙이는 식(" + CONST + ")으로 바꿔 줍니다.
     이걸 안 하면 화면에 @@CHECKED_ON@@ 이 그대로 보입니다. */
  const CONSTS = ['CHECKED_ON', 'PAY_CHECKED', 'LEGAL_CHECKED', 'PAY_SRC'];
  const marker = /@@(CHECKED_ON|PAY_CHECKED|LEGAL_CHECKED|PAY_SRC)@@/;

  let json = JSON.stringify(obj, null, 2);
  json = json.replace(/"((?:[^"\\]|\\.)*)"/g, (whole, inner) => {
    if (!marker.test(inner)) return whole;

    const parts = inner.split(/@@(?:CHECKED_ON|PAY_CHECKED|LEGAL_CHECKED|PAY_SRC)@@/);
    const names = [];
    let m, rest = inner;
    const g = /@@(CHECKED_ON|PAY_CHECKED|LEGAL_CHECKED|PAY_SRC)@@/g;
    while ((m = g.exec(inner)) !== null) names.push(m[1]);

    const pieces = [];
    parts.forEach((text, i) => {
      if (text) pieces.push('"' + text + '"');
      if (i < names.length) pieces.push(names[i]);
    });
    return pieces.length ? pieces.join(' + ') : '""';
  });

  return `/* E9-Bridge — UI 문자열 (${lang})
   ⚠ tools/make-lang.mjs 가 만든 기계 번역 초안입니다.
      사람이 검수하기 전에는 core.js 의 EUM_DRAFT_LANGS 에서 빼지 마세요.
      특히 기한·횟수·전화번호가 원문과 같은지 확인이 필요합니다.
   공용 상수(CHECKED_ON 등)는 core.js 에 있습니다. */

I18N.${lang} = ${json};
`;
}

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('어떤 언어를 만들지 코드를 적어 주세요.  예: node tools/make-lang.mjs km ne my si uz');
  process.exit(1);
}

for (const lang of targets) {
  if (!NAME[lang]) { console.error(`! ${lang} — 아는 언어 코드가 아닙니다. 건너뜁니다.`); continue; }
  console.log(`\n[${lang}] ${NAME[lang]}`);

  const ko = loadKo();
  const items = [];
  collect(ko, items, []);
  console.log(`  문자열 ${items.length}개`);

  const done = await translateAll(items, lang, '번역');
  items.forEach((it, i) => setAt(ko, it.path, done[i]));

  const out = path.join(DIR, lang + '.js');
  fs.writeFileSync(out, dump(lang, ko), 'utf8');
  console.log(`  → ${out}`);
}

console.log('\n끝났습니다. 이어서 node tools/check-lang.mjs 로 키가 빠지지 않았는지 보세요.');
