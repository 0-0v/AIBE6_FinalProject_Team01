ALTER TABLE itinerary_items
    ADD COLUMN transport_detail VARCHAR(255) NULL
        COMMENT '노선, 역, 정류장 등 이동 상세 정보' AFTER transport_mode,
    ADD COLUMN transport_mode_manual BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT '사용자가 직접 선택한 이동수단 여부' AFTER transport_detail,
    ADD COLUMN transport_mode_preference VARCHAR(20) NULL
        COMMENT '사용자가 선택한 이동수단 enum 값' AFTER transport_mode_manual;
