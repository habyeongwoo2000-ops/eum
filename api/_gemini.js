/* Gemini 호출 한 곳 — 키 여러 개를 돌려 씁니다.

   왜 필요한가
     무료 등급 키 하나에는 분당·하루 한도가 있습니다. 한도가 차면 429 가
     돌아오고, 그 순간부터 질문·번역이 전부 멈춥니다. 키를 여러 개 두고
     막힌 키를 잠시 쉬게 하면서 다음 키로 넘기면 그 시간을 넘길 수 있습니다.

   환경변수 (Vercel → Settings → Environment Variables)
     GEMINI_API_KEY      첫 번째 키. 지금까지 쓰던 이름 그대로입니다.
     GEMINI_API_KEY_2    두 번째
     GEMINI_API_KEY_3    세 번째
     GEMINI_API_KEY_4    네 번째
     GEMINI_API_KEY_5    다섯 번째
     GEMINI_API_KEYS     (선택) 쉼표로 이어 붙여 한 번에 넣고 싶을 때

     키를 몇 개 넣든 상관없습니다. 하나만 넣으면 예전과 똑같이 동작합니다.
     ※ 키를 코드 파일에 적지 마세요. 깃허브에 올라가면 남이 씁니다.

   어떻게 도는가
     · 요청마다 시작 키를 하나씩 옮겨 가며 고릅니다(라운드 로빈).
       늘 1번 키부터 쓰면 1번만 빨리 닳습니다.
     · 429(한도 초과)면 그 키를 잠시 쉬게 하고 곧바로 다음 키로 넘어갑니다.
       기다리지 않습니다. 한도는 기다린다고 그 자리에서 풀리지 않습니다.
     · 503·500 처럼 잠깐 몰린 것이면 짧게 기다렸다 같은 키로 다시 시도합니다.
     · 400·401 처럼 다시 해도 같은 답이 올 오류는 그 자리에서 멈춥니다.

   쉬는 시간(cooldown)은 이 서버 인스턴스의 메모리에만 있습니다. 인스턴스가
   새로 뜨면 초기화되는데, 그래도 됩니다. 그때는 한 번 429 를 받고 다시
   쉬게 하면 그만입니다. 이것 때문에 외부 저장소를 두는 것은 과합니다. */

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

/* 쓸 모델을 순서대로 적어 둡니다.
   503(UNAVAILABLE)은 "이 키의 한도 초과"가 아니라 "이 모델이 지금 붐빈다"는
   뜻입니다. 그래서 키를 아무리 돌려도 같은 모델로 가면 똑같이 막힙니다.
   앞 모델이 붐비면 다음 모델로 넘어가야 뚫립니다.

   환경변수 GEMINI_MODELS 에 쉼표로 적어 바꿀 수 있습니다.
   앞쪽이 품질이 좋고, 뒤로 갈수록 가볍고 덜 붐빕니다. */
const MODELS = String(process.env.GEMINI_MODELS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const MODEL_CHAIN = MODELS.length ? MODELS : [
  MODEL,
  'gemini-3.6-flash',
  'gemini-flash-lite-latest'
];

/* 붐비는 모델도 잠시 쉬게 합니다. 한 요청에서 막힌 모델을
   같은 인스턴스의 다음 요청에서 또 처음부터 두드릴 이유가 없습니다. */
const modelCooldown = Object.create(null);
const MODEL_REST = 45 * 1000;
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

/* 다시 시도해 볼 만한 오류 — 잠깐 몰렸거나 서버가 흔들린 경우 */
const TRANSIENT = [500, 502, 503, 504];
/* 같은 키로는 더 해봐야 소용없는 오류 — 다음 키로 넘깁니다 */
const QUOTA = [429];

const WAITS = [600, 1500];        // 일시적 오류일 때만 쓰는 대기(ms)

/* 시간 제한 — 이게 없으면 구글이 응답을 안 주고 붙잡고 있을 때
   한 번의 호출이 하염없이 기다립니다. 모델 3개 × 키 5개가 쌓이면
   함수가 300초를 채우고 504 로 죽습니다. 사용자는 4~5분을 기다리다
   아무것도 못 받습니다.

   한 번 호출에 걸 시간, 그리고 전체에 걸 시간을 따로 둡니다.
   전체 제한이 있어야 "모델을 더 시도하다 시간 초과"를 막을 수 있습니다. */
const CALL_MS = Number(process.env.GEMINI_CALL_MS || 25000);   // 한 번 호출
const TOTAL_MS = Number(process.env.GEMINI_TOTAL_MS || 55000); // 전체

/* 키마다 "언제까지 쉰다"를 적어 둡니다. { [key]: 밀리초 타임스탬프 } */
const cooldown = Object.create(null);
let cursor = 0;                   // 라운드 로빈 시작 위치

function loadKeys() {
  const out = [];
  const push = (v) => {
    const k = String(v || '').trim();
    if (k && out.indexOf(k) === -1) out.push(k);
  };

  push(process.env.GEMINI_API_KEY);
  for (let i = 2; i <= 10; i++) push(process.env['GEMINI_API_KEY_' + i]);
  String(process.env.GEMINI_API_KEYS || '').split(',').forEach(push);

  return out;
}

/* 구글이 "얼마 뒤에 다시 오라"고 알려 주면 그 값을 씁니다.
   없으면 하루 한도인지 분당 한도인지 문구로 어림잡습니다. */
function cooldownMs(detail) {
  const m = /"retryDelay"\s*:\s*"(\d+)s"/.exec(detail || '');
  if (m) return (parseInt(m[1], 10) + 2) * 1000;
  if (/PerDay|per day|daily/i.test(detail || '')) return 6 * 60 * 60 * 1000;
  return 70 * 1000;               // 분당 한도는 1분이면 풀립니다
}

function available(keys) {
  const now = Date.now();
  return keys.filter((k) => !(cooldown[k] > now));
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/* payload 는 generateContent 에 보낼 본문(객체)입니다.
   돌려주는 값: { ok, status, data, detail, keyIndex, triedKeys } */
async function generate(payload, opts) {
  const options = opts || {};
  const model = options.model || MODEL;
  const keys = loadKeys();

  if (!keys.length) {
    return { ok: false, status: 500, detail: 'no key', reason: 'nokey' };
  }

  // 쉬고 있지 않은 키부터. 전부 쉬는 중이면 어쩔 수 없이 전체를 다시 봅니다.
  let pool = available(keys);
  if (!pool.length) pool = keys.slice();

  // 시작 위치를 옮겨 가며 골라, 특정 키만 빨리 닳지 않게 합니다.
  const start = cursor++ % pool.length;
  const order = pool.slice(start).concat(pool.slice(0, start));

  const body = JSON.stringify(payload);
  let lastStatus = 0, lastDetail = '', tried = 0;
  const startedAt = Date.now();
  let timedOut = false;

  /* 지정한 모델이 있으면 그것만, 없으면 목록을 순서대로 시도합니다. */
  const chain = options.model ? [options.model] : MODEL_CHAIN;
  const now0 = Date.now();
  const models = chain.filter((m) => !(modelCooldown[m] > now0));
  const useModels = models.length ? models : chain.slice();

  for (const m of useModels) {
    if (timedOut || Date.now() - startedAt > TOTAL_MS) { timedOut = true; break; }
    let modelBusy = 0;

    for (const key of order) {
      if (timedOut) break;
      if (modelCooldown[m] > Date.now()) break;   // 위에서 접힌 모델
      tried++;
      const url = ENDPOINT + m + ':generateContent?key=' + encodeURIComponent(key);

      /* 503 은 같은 모델로 다시 눌러도 대개 그대로입니다. 그래서 재시도는
         500·502·504(서버가 잠깐 흔들린 경우)에만 씁니다. 503 이면 곧바로
         다음 키 → 다음 모델로 넘어가, 사용자를 오래 기다리게 하지 않습니다. */
      for (let attempt = 0; attempt <= WAITS.length; attempt++) {
        /* 전체 시간을 넘겼으면 더 시도하지 않고 나갑니다.
           여기서 멈춰야 함수가 죽는 대신 "지금 붐빈다"는 안내를 돌려줄 수 있습니다. */
        if (Date.now() - startedAt > TOTAL_MS) {
          console.warn('gemini timeout: 전체 제한 ' + TOTAL_MS + 'ms 초과 — 중단');
          timedOut = true;
          break;
        }

        let r;
        const ac = new AbortController();
        const killer = setTimeout(function () { ac.abort(); }, CALL_MS);
        try {
          r = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: body,
            signal: ac.signal
          });
        } catch (e) {
          const aborted = e && (e.name === 'AbortError' || /abort/i.test(String(e.message || '')));
          lastStatus = 0;
          lastDetail = aborted ? ('no response in ' + CALL_MS + 'ms') : String((e && e.message) || e);
          if (aborted) {
            // 응답을 안 주는 모델입니다. 같은 모델로 더 기다릴 이유가 없습니다.
            console.warn('gemini slow: 모델 ' + m + ' 응답 없음 → 다음으로');
            modelBusy++;
            break;
          }
          if (attempt < WAITS.length) { await sleep(WAITS[attempt]); continue; }
          break;
        } finally {
          clearTimeout(killer);
        }

        if (r.ok) {
          return {
            ok: true, status: 200, data: await r.json(),
            model: m, keyIndex: keys.indexOf(key) + 1, triedKeys: tried
          };
        }

        lastStatus = r.status;
        lastDetail = await r.text();

        if (QUOTA.indexOf(r.status) !== -1) {
          const ms = cooldownMs(lastDetail);
          cooldown[key] = Date.now() + ms;
          console.warn('gemini quota: key #' + (keys.indexOf(key) + 1) +
            ' 쉼 ' + Math.round(ms / 1000) + 's');
          break;                       // 다음 키로
        }

        if (r.status === 503) { modelBusy++; break; }   // 붐빔 → 다음 키로

        /* 404 는 "그런 모델이 없다"입니다. 구글이 모델을 정리하면 이름이
           사라집니다. 키를 바꿔도 소용없으니 이 모델은 통째로 접고
           다음 모델로 넘어갑니다. 다시 살아날 이름이 아니므로 오래 쉬게 합니다. */
        if (r.status === 404) {
          modelCooldown[m] = Date.now() + 24 * 60 * 60 * 1000;
          console.warn('gemini gone: 모델 ' + m + ' 없어짐 → 다음 모델로  ' +
            lastDetail.slice(0, 160));
          modelBusy = order.length;     // 이 모델의 남은 키는 건너뜁니다
          break;
        }

        if (TRANSIENT.indexOf(r.status) !== -1 && attempt < WAITS.length) {
          await sleep(WAITS[attempt]);
          continue;
        }

        if (TRANSIENT.indexOf(r.status) === -1) {
          // 400·401·403 — 모델을 바꿔도 같은 결과입니다. 그 자리에서 멈춥니다.
          console.error('gemini error', r.status, lastDetail.slice(0, 300));
          return {
            ok: false, status: r.status, detail: lastDetail,
            reason: 'bad', model: m, keyIndex: keys.indexOf(key) + 1
          };
        }
        break;
      }
    }

    if (modelBusy >= order.length) {
      // 이 모델은 어느 키로 가도 붐빕니다. 잠시 쉬게 하고 다음 모델로.
      modelCooldown[m] = Date.now() + MODEL_REST;
      console.warn('gemini busy: 모델 ' + m + ' 붐빔 → 다음 모델로');
    }
  }

  console.error('gemini 모든 모델 실패', lastStatus,
    (timedOut ? '(시간 초과) ' : '') + String(lastDetail).slice(0, 200),
    '· 걸린 시간 ' + (Date.now() - startedAt) + 'ms');
  return {
    ok: false,
    status: lastStatus || 503,
    detail: lastDetail,
    timedOut: timedOut,
    reason: QUOTA.indexOf(lastStatus) !== -1 ? 'quota' : 'busy',
    triedKeys: tried,
    totalKeys: keys.length,
    triedModels: useModels.length
  };
}

/* 답변 글자만 꺼내 씁니다. 없으면 빈 문자열. */
function textOf(data) {
  const parts = (((data || {}).candidates || [])[0] || {}).content;
  if (!parts || !parts.parts) return '';
  return parts.parts.map((p) => p.text || '').join('').trim();
}

function keyCount() {
  return loadKeys().length;
}

module.exports = { generate, textOf, keyCount, MODEL, MODEL_CHAIN };
