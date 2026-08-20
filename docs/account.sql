-- E9-Bridge — 마이페이지(닉네임) 추가분
-- board_schema.sql → social_login.sql 다음에 실행하세요.
-- 여러 번 실행해도 안전합니다.
--
-- 왜 닉네임을 따로 두는가
--   지금까지는 username 하나가 "로그인 아이디"와 "게시판에 보이는 이름"을
--   겸하고 있었습니다. 그 상태에서 이름을 바꾸게 하면 로그인 아이디가 같이
--   바뀌어, 다음에 들어올 때 본인이 못 들어옵니다.
--   그래서 화면에 보이는 이름(nickname)만 따로 떼어 바꿀 수 있게 합니다.
--
--   username  로그인할 때 쓰는 아이디. 바꾸지 않습니다.
--             소셜로 들어온 사람은 user_1a2b3c4d 같은 내부용 값이라
--             화면에 보이지 않습니다.
--   nickname  게시판과 머리말에 보이는 이름. 본인이 바꿉니다.

alter table eum_users add column if not exists nickname text;

-- 기존 계정은 쓰던 아이디를 그대로 이름으로 씁니다. 화면상 달라지는 게 없습니다.
update eum_users set nickname = username where nickname is null;

alter table eum_users alter column nickname set not null;

-- 2~20자. 공백과 특수문자는 서버(api/account.js)에서 한 번 더 거릅니다.
do $$ begin
  alter table eum_users add constraint eum_users_nickname_len_ck
    check (char_length(nickname) between 2 and 20);
exception when duplicate_object then null; end $$;

-- 같은 이름을 두 사람이 쓰지 못하게 막습니다.
-- 대소문자만 다른 이름으로 남을 사칭하는 것도 함께 막습니다.
create unique index if not exists eum_users_nickname_idx
  on eum_users (lower(nickname));

-- ── 운영 메모 ─────────────────────────────────────────────────
--
-- 문제가 되는 닉네임을 바꿔야 할 때
--   update eum_users set nickname = 'user_replaced' where nickname = '...';
--   그 사람이 쓴 글의 표시 이름도 함께 바꾸려면:
--   update eum_posts set username = 'user_replaced' where user_id = '...';
--
-- 누가 어떤 이름을 쓰는지 보기
--   select provider, username, nickname, created_at from eum_users order by created_at desc;
