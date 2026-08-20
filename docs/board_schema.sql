-- E9-Bridge — 로그인 + 공개 게시판 스키마
-- Supabase 프로젝트 → SQL Editor 에 그대로 붙여 실행하세요.
--
-- 기억할 것 두 가지
--  1) 비밀번호는 해시만 저장합니다. 원래 값은 어디에도 남지 않습니다.
--  2) 두 표 모두 RLS 를 켜고 정책을 만들지 않습니다. 브라우저에서는 접근할 수
--     없고, Vercel 서버 함수가 service_role 키로만 읽고 씁니다.

-- ── 회원 ──────────────────────────────────────────────────────
create table if not exists eum_users (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  username      text        not null unique
                  check (username ~ '^[a-z0-9_]{4,20}$'),
  password_hash text        not null
);

-- ── 공개 게시글 ───────────────────────────────────────────────
-- 사용자가 쓴 글이 그대로 공개됩니다. 화면에서 회사명·실명을 쓰지 말라고
-- 안내하지만, 그래도 개인정보가 섞여 들어올 수 있습니다.
-- 관리자는 문제가 되는 글을 지울 수 있어야 합니다(테이블 편집기에서 삭제).
create table if not exists eum_posts (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  user_id     uuid        not null references eum_users(id) on delete cascade,
  username    text        not null,          -- 화면 표시용

  orig_lang   text        not null check (orig_lang in ('ko','en','vi','th','id')),
  orig_body   text        not null check (char_length(orig_body) between 5 and 1000),
  body        jsonb       not null,          -- {"ko":"...","en":"...",...} 등록 시 1회 번역

  -- 아래는 운영자가 답변할 때만 채웁니다. 비어 있어도 글은 정상 표시됩니다.
  answer      jsonb,                          -- {"ko":"...","en":"...",...}
  src         text,                           -- 근거 (법령·공지). 답변에는 반드시 붙입니다.
  checked     date                            -- 확인일
);

create index if not exists eum_posts_recent_idx on eum_posts (created_at desc);
create index if not exists eum_posts_user_idx   on eum_posts (user_id);

-- ── 잠그기 ────────────────────────────────────────────────────
alter table eum_users enable row level security;
alter table eum_posts enable row level security;

-- ── 운영 메모 ─────────────────────────────────────────────────
-- 답변 달기
--   1) eum_posts 에서 답변할 행을 엽니다.
--   2) answer 에 5개 언어를 넣습니다.
--      예) {"ko":"...","en":"...","vi":"...","th":"...","id":"..."}
--      한국어만 넣어도 화면은 한국어로 물러나 표시합니다.
--   3) src 와 checked 를 반드시 채웁니다. 근거 없는 답변은 올리지 않습니다.
--
-- 문제 글 지우기
--   delete from eum_posts where id = '...';
--
-- 계정 지우기 (그 사람이 쓴 글도 함께 지워집니다)
--   delete from eum_users where username = '...';
