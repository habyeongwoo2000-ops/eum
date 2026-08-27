/* 언어 파일 검사 — 키가 빠졌는지, 숫자가 바뀌었는지 봅니다.
   ────────────────────────────────────────────────────────────────
   쓰는 법:  node tools/check-lang.mjs

   무엇을 보나
     1) 키 개수와 이름이 한국어와 같은가        ← 빠지면 그 언어에 빈칸이 보입니다
     2) {d} {y} 같은 자리표시자가 살아 있는가   ← 깨지면 "{d}일 남음" 이 그대로 나옵니다
     3) 전화번호와 기한 숫자가 그대로인가       ← 이게 틀리면 사람이 다칩니다

   3번이 이 검사의 존재 이유입니다. 번역기는 1345 를 1,345 로 바꾸거나
   현지 숫자(੧੩੪੫)로 옮겨 적는 일이 있습니다. 그러면 전화가 안 걸립니다.
*/

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'assets', 'i18n');

function load(code) {
  const src = fs.readFileSync(path.join(DIR, code + '.js'), 'utf8');
  const fn = new Function('CHECKED_ON', 'PAY_CHECKED', 'LEGAL_CHECKED', 'PAY_SRC', 'I18N',
    src + '; return I18N.' + code + ';');
  return fn('X', 'Y', 'Z', 'S', {});
}

function flatten(node, out, trail) {
  if (typeof node === 'string') { out[trail.join('.')] = node; return; }
  if (Array.isArray(node)) { node.forEach((v, i) => flatten(v, out, trail.concat(i))); return; }
  if (node && typeof node === 'object') {
    Object.keys(node).forEach((k) => flatten(node[k], out, trail.concat(k)));
  }
}

/* 반드시 그대로 남아야 하는 것들 */
const PHONES = ['1345', '1350', '1355', '1600-0266', '1331'];
const PLACEHOLDER = /\{[a-z]\}/g;

/* core.js 에 적힌 초안 언어는 "덜 됐다"가 정상입니다. 실패로 세지 않고
   따로 보고합니다. 검수가 끝나 EUM_DRAFT_LANGS 에서 빠지는 순간부터
   다른 언어와 똑같은 기준으로 검사합니다. */
const coreSrc = fs.readFileSync(path.join(DIR, 'core.js'), 'utf8');
const DRAFT = (coreSrc.match(/EUM_DRAFT_LANGS\s*=\s*\[([^\]]*)\]/) || [, ''])[1]
  .split(',').map((x) => x.replace(/['"\s]/g, '')).filter(Boolean);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js') && f !== 'core.js');
const codes = files.map((f) => f.replace('.js', ''));

const ko = {};
flatten(load('ko'), ko, []);
const koKeys = Object.keys(ko);
console.log(`기준(ko): 문자열 ${koKeys.length}개\n`);

let bad = 0;
for (const code of codes) {
  if (code === 'ko') continue;
  const cur = {};
  flatten(load(code), cur, []);

  const missing = koKeys.filter((k) => !(k in cur));
  const extra = Object.keys(cur).filter((k) => !(k in ko));

  const phoneBad = [];
  const holderBad = [];
  for (const k of koKeys) {
    if (!(k in cur)) continue;
    for (const p of PHONES) {
      if (ko[k].includes(p) && !cur[k].includes(p)) phoneBad.push(`${k} → ${p}`);
    }
    const want = (ko[k].match(PLACEHOLDER) || []).sort().join(',');
    const got = (cur[k].match(PLACEHOLDER) || []).sort().join(',');
    if (want !== got) holderBad.push(`${k} (${want || '없음'} → ${got || '없음'})`);
  }

  const isDraft = DRAFT.includes(code);
  const ok = !missing.length && !extra.length && !phoneBad.length && !holderBad.length;

  if (isDraft) {
    const done = koKeys.length - missing.length;
    const pct = Math.round(done / koKeys.length * 100);
    console.log(`  초안  ${code}: ${done}/${koKeys.length} (${pct}%) — 나머지는 영어로 채워집니다`);
    if (extra.length) console.log(`        없는 키 ${extra.length}: ${extra.slice(0, 5).join(', ')}`);
    if (phoneBad.length) console.log(`        !! 전화번호 사라짐: ${phoneBad.slice(0, 5).join(' / ')}`);
    if (holderBad.length) console.log(`        !! 자리표시자 깨짐: ${holderBad.slice(0, 5).join(' / ')}`);
    if (extra.length || phoneBad.length || holderBad.length) bad++;
    continue;
  }

  console.log(`${ok ? '  OK  ' : '  !!  '}${code}: ${Object.keys(cur).length}개`);
  if (missing.length) console.log(`        빠진 키 ${missing.length}: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}`);
  if (extra.length) console.log(`        없는 키 ${extra.length}: ${extra.slice(0, 5).join(', ')}`);
  if (phoneBad.length) console.log(`        전화번호 사라짐: ${phoneBad.slice(0, 5).join(' / ')}`);
  if (holderBad.length) console.log(`        자리표시자 깨짐: ${holderBad.slice(0, 5).join(' / ')}`);
  if (!ok) bad++;
}

console.log(bad ? `\n${bad}개 언어에 문제가 있습니다. 고친 뒤 EUM_LANGS 에 넣으세요.`
  : '\n모두 통과했습니다.');
process.exit(bad ? 1 : 0);
