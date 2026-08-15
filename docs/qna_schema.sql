-- 이음 — 묻고 답하기(Q&A) 게시판 스키마
-- Supabase 프로젝트 → SQL Editor 에 그대로 붙여 실행하세요.
--
-- 설계 두 가지만 기억하면 됩니다.
--  1) 사용자가 쓴 원문(asked_*)은 절대 공개되지 않습니다. 관리자만 봅니다.
--  2) 공개되는 글(pub_*)은 관리자가 식별 정보를 지우고 새로 쓴 것입니다.
--     번역은 게시 시점에 1회만 돌려 5개 언어를 모두 저장합니다. 조회는 공짜입니다.

create table if not exists qna (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- ── 비공개: 사용자가 남긴 원문 ────────────────────────────────
  asked_lang    text        not null check (asked_lang in ('ko','en','vi','th','id')),
  asked_body    text        not null check (char_length(asked_body) between 5 and 1000),
  asked_body_ko text,       -- 관리자가 읽을 한국어 번역 (등록 시 1회 생성)

  -- ── 관리자가 손으로 채우는 공개용 초안 (한국어) ────────────────
  -- Supabase 테이블 편집기에서 바로 쓸 수 있게 평문 컬럼으로 뒀습니다.
  draft_title_ko  text,
  draft_body_ko   text,     -- 익명화한 질문. 회사명·날짜·지역을 지우고 다시 쓰세요.
  draft_answer_ko text,

  -- ── 게시 결과 ────────────────────────────────────────────────
  status        text        not null default 'pending'
                  check (status in ('pending','ready','published','rejected')),
  pub_title     jsonb,      -- {"ko":"...","en":"...","vi":"...","th":"...","id":"..."}
  pub_body      jsonb,
  pub_answer    jsonb,
  src           text,       -- 근거 (법령·공지). 답변에는 반드시 붙입니다.
  checked       date,       -- 확인일
  published_at  timestamptz
);

-- 공개 목록 조회용
create index if not exists qna_published_idx
  on qna (published_at desc) where status = 'published';

-- 관리자가 처리할 것만 빨리 찾도록
create index if not exists qna_status_idx on qna (status, created_at);

-- ── 잠그기 ────────────────────────────────────────────────────
-- RLS 를 켜고 정책을 하나도 만들지 않습니다.
-- 그러면 anon / authenticated 키로는 이 표의 어떤 행도 읽거나 쓸 수 없습니다.
-- 읽기·쓰기는 전부 Vercel 서버리스 함수가 service_role 키로 대신합니다.
-- (Supabase 대시보드의 테이블 편집기는 RLS 를 우회하므로 관리자 작업에는 영향이 없습니다.)
alter table qna enable row level security;

-- ── 관리자 작업 순서 ──────────────────────────────────────────
--  1) status = 'pending' 행의 asked_body_ko 를 읽습니다.
--  2) draft_title_ko / draft_body_ko / draft_answer_ko / src / checked 를 채웁니다.
--     · draft_body_ko 는 반드시 익명화하세요. 회사명, 정확한 날짜, 지역, 이름을 지웁니다.
--     · src 없이 답변하지 않습니다. 근거가 없으면 1345 안내로 돌립니다.
--  3) status 를 'ready' 로 바꿉니다.
--  4) POST /api/qna-publish 를 호출합니다. 번역 후 'published' 로 바뀝니다.
--  공개하지 않을 질문은 status 를 'rejected' 로 두면 목록에 나오지 않습니다.
--
-- 자주 쓰는 조회:
--   select id, created_at, asked_lang, asked_body_ko from qna where status = 'pending' order by created_at;
