-- E9-Bridge — 관리자 계정
-- account.sql 다음에 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 관리자는 일반 회원과 같은 방식(아이디+비밀번호 또는 구글/카카오)으로
-- 가입·로그인하고, is_admin 만 true 로 켜 둔 계정입니다. 관리자로 로그인하면
-- 게시판의 각 글 아래에 답변을 쓰고 저장할 수 있는 칸이 보입니다
-- (비공개 글을 포함해 모든 글을 볼 수 있습니다).
--
-- 관리자 계정 만드는 두 가지 방법
--   1) 이 화면(Supabase SQL Editor)에서 직접
--        update eum_users set is_admin = true where username = '아이디';
--
--   2) 사이트의 /admin.html 에서 (Supabase에 안 들어와도 됨, 휴대폰도 가능)
--      먼저 Vercel 환경변수에 ADMIN_SETUP_KEY 를 아무 값이나 길고 무작위하게
--      정해 두고, /admin.html 에서 그 키와 계정 아이디를 넣으면 관리자로
--      바뀝니다. 이 키를 아는 사람만 관리자를 만들 수 있으니 남에게 보여주지
--      마세요.

alter table eum_users add column if not exists is_admin boolean not null default false;

-- ── 운영 메모 ─────────────────────────────────────────────────
-- 관리자 해제
--   update eum_users set is_admin = false where username = '...';
--
-- 누가 관리자인지 보기
--   select username, nickname, is_admin from eum_users where is_admin = true;
