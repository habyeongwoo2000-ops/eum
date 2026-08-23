-- E9-Bridge — 마이페이지(프로필) 추가분
-- account.sql 다음에 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 마이페이지에 생년월일 · 국적 · 성별을 추가합니다. 세 칸 모두 입력하지
-- 않아도 되며(선택), 채워두면 사업장 변경 신청 서류를 준비할 때 참고용으로
-- 씁니다. 실제 값 검사는 api/account.js 에서 한 번 더 합니다.

alter table eum_users add column if not exists birthdate date;
alter table eum_users add column if not exists nationality text;
alter table eum_users add column if not exists gender text;

-- 성별은 남/여 둘 중 하나이거나, 아예 비워 둘 수 있습니다.
do $$ begin
  alter table eum_users add constraint eum_users_gender_ck
    check (gender is null or gender in ('M','F'));
exception when duplicate_object then null; end $$;

-- 국적은 고용허가제(E-9) 송출 16개국 코드 + '기타' 중 하나이거나 비워 둘 수 있습니다.
-- 목록이 바뀌면 api/account.js 의 NAT_CODES 도 함께 고치세요.
do $$ begin
  alter table eum_users add constraint eum_users_nationality_ck
    check (nationality is null or nationality in (
      'PH','MN','LK','VN','TH','ID','UZ','PK','KH','CN','BD','NP','MM','KG','TL','LA','TJ','KZ','other'
    ));
exception when duplicate_object then null; end $$;

-- 생년월일은 미래일 수 없고, 너무 오래된 값(1930년 이전)도 막습니다.
do $$ begin
  alter table eum_users add constraint eum_users_birthdate_ck
    check (birthdate is null or (birthdate <= current_date and birthdate >= date '1930-01-01'));
exception when duplicate_object then null; end $$;
