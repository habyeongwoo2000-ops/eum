/* Supabase REST 공용 호출 — 브라우저로 내려가지 않습니다.
   service_role 키는 이 파일과 같은 서버 함수 안에서만 씁니다.

   환경변수
     SUPABASE_URL                 예) https://abcd.supabase.co
     SUPABASE_SERVICE_ROLE_KEY    service_role 키. 절대 공개하지 마세요. */

function base() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabase env not set');
  return { url: url.replace(/\/+$/, ''), key: key };
}

function headers(key, extra) {
  return Object.assign({
    apikey: key,
    authorization: 'Bearer ' + key,
    'content-type': 'application/json'
  }, extra || {});
}

/* 일반 호출. 결과 배열(또는 null)만 돌려줍니다. */
async function sb(path, init) {
  const b = base();
  const opts = Object.assign({}, init);
  opts.headers = headers(b.key, (init && init.headers) || {});

  const r = await fetch(b.url + '/rest/v1/' + path, opts);
  if (!r.ok) {
    const detail = await r.text();
    throw new Error('supabase ' + r.status + ' ' + detail.slice(0, 300));
  }
  if (r.status === 204) return null;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

/* 페이지 나누기용. 구간을 잘라 오면서 전체 개수도 함께 받습니다.
   Supabase 는 content-range 헤더에 "0-9/57" 형태로 총계를 실어 줍니다. */
async function sbRange(path, from, to) {
  const b = base();
  const r = await fetch(b.url + '/rest/v1/' + path, {
    method: 'GET',
    headers: headers(b.key, {
      range: from + '-' + to,
      'range-unit': 'items',
      prefer: 'count=exact'
    })
  });

  if (!r.ok && r.status !== 206) {
    const detail = await r.text();
    throw new Error('supabase ' + r.status + ' ' + detail.slice(0, 300));
  }

  const rows = JSON.parse((await r.text()) || '[]');
  const cr = r.headers.get('content-range') || '';       // 예) 0-9/57
  const total = Number(String(cr).split('/')[1]);
  return { rows: rows, total: Number.isFinite(total) ? total : rows.length };
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

module.exports = { sb, sbRange, readBody };
