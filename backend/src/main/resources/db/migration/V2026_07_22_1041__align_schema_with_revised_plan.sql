-- Removed features. Child tables must be dropped before their parents.
DROP TABLE IF EXISTS voice_room_participants;
DROP TABLE IF EXISTS voice_rooms;
DROP TABLE IF EXISTS chat_message_reads;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS card_comments;

-- Member and trip planning extensions.
ALTER TABLE members
    ADD COLUMN default_region VARCHAR(255) NULL AFTER provider_id,
    ADD CONSTRAINT uk_members_email UNIQUE (email),
    ADD CONSTRAINT uk_members_provider_id UNIQUE (provider_id);

ALTER TABLE trips
    MODIFY COLUMN start_date DATE NULL,
    MODIFY COLUMN end_date DATE NULL,
    ADD COLUMN travel_style VARCHAR(30) NULL AFTER transport_type,
    ADD COLUMN activity_level VARCHAR(20) NULL AFTER travel_style,
    ADD COLUMN currency VARCHAR(10) NULL AFTER total_budget,
    ADD COLUMN meeting_place_id BIGINT NULL AFTER currency;

UPDATE trips
SET currency = 'KRW'
WHERE currency IS NULL;

ALTER TABLE trips
    MODIFY COLUMN currency VARCHAR(10) NOT NULL,
    ADD INDEX idx_trips_meeting_place_id (meeting_place_id),
    ADD CONSTRAINT fk_trips_meeting_place FOREIGN KEY (meeting_place_id) REFERENCES places (id);

ALTER TABLE places
    ADD COLUMN phone_number VARCHAR(50) NULL AFTER website_url,
    ADD COLUMN business_status VARCHAR(30) NULL AFTER phone_number;

CREATE TABLE member_availabilities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    available_start_at DATETIME NOT NULL,
    available_end_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_member_availabilities_trip_id (trip_id),
    INDEX idx_member_availabilities_member_id (member_id),
    CONSTRAINT fk_member_availabilities_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_member_availabilities_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_date_candidates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    available_count INT NOT NULL,
    total_member_count INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_date_candidates_trip_dates UNIQUE (trip_id, start_date, end_date),
    CONSTRAINT fk_trip_date_candidates_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE member_departures (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    place_id BIGINT NOT NULL,
    transport_type VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_member_departures_trip_member UNIQUE (trip_id, member_id),
    INDEX idx_member_departures_member_id (member_id),
    INDEX idx_member_departures_place_id (place_id),
    CONSTRAINT fk_member_departures_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_member_departures_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_member_departures_place FOREIGN KEY (place_id) REFERENCES places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meeting_point_candidates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    place_id BIGINT NOT NULL,
    total_travel_minutes INT NOT NULL,
    max_travel_minutes INT NOT NULL,
    travel_time_gap INT NULL,
    accessibility_score DECIMAL(5, 4) NULL,
    route_score DECIMAL(5, 4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    calculation_json JSON NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_meeting_point_candidates_trip_place UNIQUE (trip_id, place_id),
    INDEX idx_meeting_point_candidates_place_id (place_id),
    CONSTRAINT fk_meeting_point_candidates_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_meeting_point_candidates_place FOREIGN KEY (place_id) REFERENCES places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_style_tags (
    id BIGINT NOT NULL AUTO_INCREMENT,
    place_id BIGINT NOT NULL,
    style_type VARCHAR(30) NOT NULL,
    suitability_score DECIMAL(5, 4) NOT NULL,
    source VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_style_tags_place_style UNIQUE (place_id, style_type),
    CONSTRAINT fk_place_style_tags_place FOREIGN KEY (place_id) REFERENCES places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE itinerary_items
    ADD COLUMN transport_distance_meters INT NULL AFTER transport_minutes,
    ADD CONSTRAINT uk_itinerary_items_day_sort_order UNIQUE (itinerary_day_id, sort_order);

CREATE TABLE place_graph_edges (
    id BIGINT NOT NULL AUTO_INCREMENT,
    from_place_id BIGINT NOT NULL,
    to_place_id BIGINT NOT NULL,
    transport_type VARCHAR(30) NOT NULL,
    distance_meters INT NOT NULL,
    travel_minutes INT NOT NULL,
    compatibility_score DECIMAL(5, 4) NULL,
    source VARCHAR(30) NOT NULL,
    cached_at DATETIME NOT NULL,
    expires_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_graph_edges_route UNIQUE (from_place_id, to_place_id, transport_type),
    INDEX idx_place_graph_edges_to_place_id (to_place_id),
    CONSTRAINT fk_place_graph_edges_from_place FOREIGN KEY (from_place_id) REFERENCES places (id),
    CONSTRAINT fk_place_graph_edges_to_place FOREIGN KEY (to_place_id) REFERENCES places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE agent_runs
    ADD COLUMN rewritten_query_json JSON NULL AFTER user_request,
    ADD COLUMN error_message TEXT NULL AFTER result_json;

ALTER TABLE agent_proposals
    ADD COLUMN route_score DECIMAL(5, 4) NULL AFTER confidence,
    ADD COLUMN detour_minutes INT NULL AFTER route_score,
    ADD COLUMN insertion_order INT NULL AFTER detour_minutes,
    ADD COLUMN created_at DATETIME NULL AFTER reviewed_at;

UPDATE agent_proposals
SET created_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL;

ALTER TABLE agent_proposals
    MODIFY COLUMN created_at DATETIME NOT NULL;

CREATE TABLE route_validations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    proposal_id BIGINT NOT NULL,
    itinerary_item_id BIGINT NULL,
    validation_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message VARCHAR(500) NULL,
    source_data_json JSON NULL,
    checked_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_route_validations_proposal_id (proposal_id),
    INDEX idx_route_validations_itinerary_item_id (itinerary_item_id),
    CONSTRAINT fk_route_validations_proposal FOREIGN KEY (proposal_id) REFERENCES agent_proposals (id),
    CONSTRAINT fk_route_validations_itinerary_item FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerary_executions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    itinerary_item_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    actual_start_at DATETIME NULL,
    actual_end_at DATETIME NULL,
    note TEXT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_itinerary_executions_item UNIQUE (itinerary_item_id),
    INDEX idx_itinerary_executions_updated_by (updated_by),
    CONSTRAINT fk_itinerary_executions_item FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id),
    CONSTRAINT fk_itinerary_executions_member FOREIGN KEY (updated_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE activity_logs
    ADD COLUMN metadata_json JSON NULL AFTER description;

ALTER TABLE notifications
    ADD COLUMN title VARCHAR(100) NULL AFTER notification_type,
    ADD COLUMN read_at DATETIME NULL AFTER is_read;

CREATE TABLE budgets (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_budgets_trip_id UNIQUE (trip_id),
    INDEX idx_budgets_created_by (created_by),
    CONSTRAINT fk_budgets_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_budgets_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE expenses
    ADD COLUMN currency VARCHAR(10) NULL AFTER total_amount,
    ADD COLUMN exchange_rate DECIMAL(18, 8) NULL AFTER currency,
    ADD COLUMN converted_amount DECIMAL(12, 2) NULL AFTER exchange_rate;

UPDATE expenses
SET currency = 'KRW'
WHERE currency IS NULL;

ALTER TABLE expenses
    MODIFY COLUMN currency VARCHAR(10) NOT NULL;

ALTER TABLE settlements
    ADD COLUMN currency VARCHAR(10) NULL AFTER amount;

UPDATE settlements
SET currency = 'KRW'
WHERE currency IS NULL;

ALTER TABLE settlements
    MODIFY COLUMN currency VARCHAR(10) NOT NULL;

CREATE TABLE travel_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    itinerary_item_id BIGINT NULL,
    place_id BIGINT NOT NULL,
    recorded_by BIGINT NOT NULL,
    visited_at DATETIME NOT NULL,
    memo TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_travel_records_trip_id (trip_id),
    INDEX idx_travel_records_itinerary_item_id (itinerary_item_id),
    INDEX idx_travel_records_place_id (place_id),
    INDEX idx_travel_records_recorded_by (recorded_by),
    CONSTRAINT fk_travel_records_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_travel_records_itinerary_item FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id),
    CONSTRAINT fk_travel_records_place FOREIGN KEY (place_id) REFERENCES places (id),
    CONSTRAINT fk_travel_records_member FOREIGN KEY (recorded_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE travel_photos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    travel_record_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NULL,
    sort_order INT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_travel_photos_travel_record_id (travel_record_id),
    INDEX idx_travel_photos_uploaded_by (uploaded_by),
    CONSTRAINT fk_travel_photos_record FOREIGN KEY (travel_record_id) REFERENCES travel_records (id),
    CONSTRAINT fk_travel_photos_member FOREIGN KEY (uploaded_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_retrospectives (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    rating DECIMAL(2, 1) NOT NULL,
    good_points TEXT NULL,
    improvements TEXT NULL,
    summary TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_retrospectives_trip_member UNIQUE (trip_id, member_id),
    INDEX idx_trip_retrospectives_member_id (member_id),
    CONSTRAINT fk_trip_retrospectives_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_retrospectives_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    travel_record_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    rating DECIMAL(2, 1) NOT NULL,
    comment TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_reviews_record_member UNIQUE (travel_record_id, member_id),
    INDEX idx_place_reviews_member_id (member_id),
    CONSTRAINT fk_place_reviews_record FOREIGN KEY (travel_record_id) REFERENCES travel_records (id),
    CONSTRAINT fk_place_reviews_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plan cards now represent a shareable trip summary instead of individual typed items.
ALTER TABLE plan_cards
    DROP FOREIGN KEY fk_plan_cards_trip_place,
    DROP FOREIGN KEY fk_plan_cards_itinerary_item,
    DROP FOREIGN KEY fk_plan_cards_expense,
    DROP INDEX idx_plan_cards_trip_place_id,
    DROP INDEX idx_plan_cards_itinerary_item_id,
    DROP INDEX idx_plan_cards_expense_id,
    DROP COLUMN card_type,
    DROP COLUMN description,
    DROP COLUMN image_url,
    DROP COLUMN trip_place_id,
    DROP COLUMN itinerary_item_id,
    DROP COLUMN expense_id,
    DROP COLUMN sort_order,
    ADD COLUMN summary TEXT NULL AFTER title,
    ADD COLUMN cover_image_url VARCHAR(500) NULL AFTER summary,
    ADD COLUMN visibility VARCHAR(20) NULL AFTER cover_image_url;

UPDATE plan_cards
SET visibility = 'PRIVATE'
WHERE visibility IS NULL;

ALTER TABLE plan_cards
    MODIFY COLUMN visibility VARCHAR(20) NOT NULL;

CREATE TABLE saved_trips (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    trip_id BIGINT NOT NULL,
    saved_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_saved_trips_member_trip UNIQUE (member_id, trip_id),
    INDEX idx_saved_trips_trip_id (trip_id),
    CONSTRAINT fk_saved_trips_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_saved_trips_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE trip_copies
    ADD CONSTRAINT uk_trip_copies_copied_trip_id UNIQUE (copied_trip_id);
