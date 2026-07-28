ALTER TABLE itinerary_items
    ADD COLUMN transport_meters INT NULL COMMENT '이동 거리(미터)' AFTER transport_minutes;
