/* E9-Bridge — 서비스 워커
   ------------------------------------------------------------------
   설치형 앱(PWA)과 Play 스토어 배포(TWA)의 최소 요건입니다.

   ■ 무엇을 캐시하고 무엇을 안 하는가 — 이 판단이 이 파일의 전부입니다.

   캐시함
     · HTML 화면, CSS, JS, 아이콘, 언어 파일
     · 다만 HTML 은 "네트워크 먼저" 입니다. 인터넷이 되면 항상 새 것을
       가져오고, 안 될 때만 저장해 둔 것을 씁니다.

   캐시하지 않음  ← 중요
     · /api/ 전부. 로그인 상태, 게시판 글, AI 답변이 여기로 옵니다.
       이걸 캐시하면 로그아웃했는데 로그인으로 보이거나, 남의 화면이
       남거나, 예전 답변이 다시 뜹니다.
     · admin.html, account.html — 개인 화면이라 기기에 남기지 않습니다.

   ■ 왜 HTML 을 네트워크 먼저로 두는가
     이 서비스는 법정 기한과 조문을 다룹니다. 화면에 적힌 "확인일"이
     오래된 것이면 그 자체가 사용자 피해가 됩니다. 조금 느려지더라도
     연결이 될 때는 항상 최신을 보여 줍니다.

   ■ 오프라인에서도 되는 것
     기한 계산은 브라우저 안에서 날짜만 더하는 계산이라 인터넷 없이도
     동작합니다. 기숙사에서 데이터가 떨어진 사람에게는 이 부분이 큽니다.
     AI 질문과 게시판은 연결이 필요합니다.

   ■ 고칠 때
     파일을 하나라도 바꾸면 아래 VERSION 을 올리세요. 안 올리면 사용자
     기기에 예전 파일이 남습니다.
   ------------------------------------------------------------------ */

const VERSION = 'v1';
const STATIC = 'e9b-static-' + VERSION;
const PAGES = 'e9b-pages-' + VERSION;

/* 설치할 때 미리 받아 두는 것 — 첫 화면이 오프라인에서도 뜨게 합니다. */
const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/style.css',
  '/assets/app.js',
  '/assets/data.js',
  '/assets/i18n/core.js',
  '/assets/i18n/ko.js',
  '/assets/logo-mark.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/manifest.webmanifest'
];

/* 기기에 남기지 않을 화면 */
const PRIVATE = ['/admin.html', '/account.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC)
      // 하나라도 실패하면 설치 전체가 실패하므로 개별로 담습니다.
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isApi(url) {
  return url.pathname.startsWith('/api/');
}

function isPrivate(url) {
  return PRIVATE.some((p) => url.pathname === p);
}

function isHtml(req, url) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').includes('text/html') ||
         url.pathname.endsWith('.html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // GET 만 다룹니다. 로그인·글쓰기 같은 POST 는 손대지 않습니다.
  if (req.method !== 'GET') return;

  // 다른 도메인(구글 폰트, 카카오 등)은 브라우저에 맡깁니다.
  if (url.origin !== self.location.origin) return;

  // API 와 개인 화면은 캐시를 거치지 않습니다.
  if (isApi(url) || isPrivate(url)) return;

  if (isHtml(req, url)) {
    // 네트워크 먼저 → 실패하면 저장해 둔 화면 → 그것도 없으면 오프라인 안내
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)
          .then((hit) => hit || caches.match('/offline.html')))
    );
    return;
  }

  // 그 밖의 정적 파일 — 저장해 둔 것을 바로 주고, 뒤에서 조용히 새로 받아 둡니다.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
