ALTER TABLE itinerary_days
    ADD COLUMN departure_type         VARCHAR(20)    NULL COMMENT '출발지 타입 (TRIP_PLACE|CUSTOM)',
    ADD COLUMN departure_name         VARCHAR(100)   NULL COMMENT '출발지 표시 이름',
    ADD COLUMN departure_lat          DECIMAL(9, 6)  NULL COMMENT '출발지 위도',
    ADD COLUMN departure_lng          DECIMAL(9, 6)  NULL COMMENT '출발지 경도',
    ADD COLUMN departure_trip_place_id BIGINT        NULL COMMENT '저장된 장소 기반 출발지일 때 trip_place_id',
    ADD COLUMN departure_travel_minutes INT          NULL COMMENT '출발지 → 첫 장소 이동 시간(분)',
    ADD COLUMN departure_travel_meters  INT          NULL COMMENT '출발지 → 첫 장소 이동 거리(m)',
    ADD COLUMN departure_travel_mode   VARCHAR(20)   NULL COMMENT '출발지 → 첫 장소 이동수단';
