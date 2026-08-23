-- E9-Bridge — 국적 목록 갱신 (송출국 추가)
-- profile.sql 을 이미 실행한 뒤에 이 파일을 실행하세요.
-- 여러 번 실행해도 안전합니다.
--
-- 왜 필요한가
--   처음 만든 제약에는 송출국이 16개국만 들어 있었습니다. 확인해 보니
--   타지키스탄이 빠져 있었고(2025년부터 도입), 2026-08-14 외국인력정책위원회에서
--   카자흐스탄이 새 송출국으로 지정됐습니다.
--   화면(account.html)과 서버(api/account.js)만 고치면, 저장할 때 이 제약에
--   걸려 실패합니다. 그래서 DB 쪽도 함께 넓혀 줍니다.
--
--   ※ 송출국은 앞으로도 늘어납니다. 새 나라가 지정되면
--      ① docs 의 이 목록  ② api/account.js 의 NAT_CODES
--      ③ account.html 의 <option>  ④ 각 언어 파일의 cty__ 이름
--      네 곳을 함께 고치세요.

alter table eum_users drop constraint if exists eum_users_nationality_ck;

alter table eum_users add constraint eum_users_nationality_ck
  check (nationality is null or nationality in (
    'PH','MN','LK','VN','TH','ID','UZ','PK','KH','CN','BD','NP','MM','KG','TL','LA','TJ','KZ','other'
  ));
