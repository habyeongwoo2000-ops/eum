-- E9-Bridge — 게시판 비공개 질문
-- board_schema.sql 다음에 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 글쓴이가 "비공개로 남기기"를 고르면, 그 글은 글쓴이 본인과 관리자만
-- 볼 수 있습니다. 목록 화면 자체에서 아예 걸러지므로(READ 시점에 필터링),
-- 다른 사람 화면에는 존재 자체가 보이지 않습니다.

alter table eum_posts add column if not exists is_private boolean not null default false;

create index if not exists eum_posts_private_idx on eum_posts (is_private);
