ALTER TABLE itinerary_items
    ADD COLUMN transport_mode VARCHAR(20) NULL COMMENT '이동 수단(도보/대중교통/자동차)' AFTER transport_meters;
