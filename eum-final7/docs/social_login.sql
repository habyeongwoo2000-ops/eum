-- E9-Bridge — 소셜 로그인 추가분
-- board_schema.sql 을 이미 실행한 프로젝트에 덧붙이는 변경입니다.
-- Supabase → SQL Editor 에 그대로 붙여 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 무엇이 바뀌는가
--   1) 비밀번호가 없는 계정을 허용합니다 (구글·카카오로 들어온 사람).
--   2) 어느 경로로 들어왔는지(provider)와 그쪽의 고유 번호(provider_uid)를 남깁니다.
--
-- 저장하지 않는 것
--   이름, 이메일, 프로필 사진. 제공자가 준 고유 번호만 남습니다.
--   이 표를 통째로 가져가도 그 번호로 누구인지는 알 수 없습니다.

-- ── 1. 회원 표 손보기 ─────────────────────────────────────────

-- 소셜 계정에는 비밀번호가 없습니다.
alter table eum_users alter column password_hash drop not null;

alter table eum_users
  add column if not exists provider     text not null default 'password',
  add column if not exists provider_uid text;

-- 알 수 없는 값이 들어오지 않게 막습니다.
do $$ begin
  alter table eum_users add constraint eum_users_provider_ck
    check (provider in ('password','google','kakao'));
exception when duplicate_object then null; end $$;

-- 비밀번호 계정은 해시가, 소셜 계정은 고유 번호가 반드시 있어야 합니다.
-- 둘 다 없는 행은 아무도 로그인할 수 없는 빈 계정이라 애초에 만들지 않습니다.
do $$ begin
  alter table eum_users add constraint eum_users_secret_ck check (
    (provider =  'password' and password_hash is not null) or
    (provider <> 'password' and provider_uid  is not null)
  );
exception when duplicate_object then null; end $$;

-- 같은 사람이 두 번 가입되지 않게 합니다.
-- 구글 계정과 카카오 계정은 서로 다른 사람으로 봅니다(연결 기능은 넣지 않았습니다).
create unique index if not exists eum_users_provider_uid_idx
  on eum_users (provider, provider_uid)
  where provider_uid is not null;

-- ── 2. 운영 메모 ──────────────────────────────────────────────
--
-- 어느 경로로 얼마나 들어오는지 보기
--   select provider, count(*) from eum_users group by provider;
--
-- 계정 지우기 — 그 사람이 쓴 글도 함께 지워집니다 (on delete cascade)
--   delete from eum_users where username = 'user_1a2b3c4d';
--
-- 소셜 계정에서 아이디를 바꿔 주고 싶을 때
--   update eum_users set username = 'newname' where username = 'user_1a2b3c4d';
--   (4~20자, 영문 소문자·숫자·_ 만 됩니다)
