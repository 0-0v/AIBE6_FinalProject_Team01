-- CANDIDATE 상태 제거: 장소 등록 기본값이 SAVED로 변경됨에 따라
-- 기존 CANDIDATE 장소를 SAVED로 일괄 전환한다
UPDATE trip_places SET status = 'SAVED' WHERE status = 'CANDIDATE';
