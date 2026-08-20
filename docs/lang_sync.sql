-- E9-Bridge — 로그인 계정에 언어 저장 (휴대폰 언어 자동 적용)
-- account.sql 다음에 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 지금까지는 언어 선택이 이 기기의 localStorage 에만 남아서, 같은 계정으로
-- 다른 휴대폰이나 브라우저에서 들어오면 처음 보는 사람처럼 다시 기기 언어를
-- 감지했습니다(그것도 대부분 맞긴 하지만, 예전에 직접 바꿔둔 언어는 잊혀집니다).
--
-- 이제 로그인한 사람의 언어를 계정에도 함께 저장합니다.
--   · 처음 로그인/가입할 때 이 기기가 쓰는 언어를 자동으로 계정에 저장합니다.
--   · 이후 다른 기기로 로그인하면, 그 계정에 저장된 언어로 화면이 자동으로 바뀝니다.
--   · 언어를 손으로 다시 고르면 그 값이 계정에도 다시 저장됩니다.

alter table eum_users add column if not exists lang text;

do $$ begin
  alter table eum_users add constraint eum_users_lang_ck
    check (lang is null or lang in ('ko','en','vi','th','id'));
exception when duplicate_object then null; end $$;
