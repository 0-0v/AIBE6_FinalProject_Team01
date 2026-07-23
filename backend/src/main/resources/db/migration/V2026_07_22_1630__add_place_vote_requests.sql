CREATE TABLE place_vote_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_place_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    required_response_count INT NOT NULL,
    total_member_count INT NOT NULL,
    created_at DATETIME NOT NULL,
    closed_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_vote_requests_trip_place UNIQUE (trip_place_id),
    INDEX idx_place_vote_requests_created_by (created_by),
    CONSTRAINT fk_place_vote_requests_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id) ON DELETE CASCADE,
    CONSTRAINT fk_place_vote_requests_created_by FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_vote_responses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vote_request_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    choice_value VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_vote_responses_request_member UNIQUE (vote_request_id, member_id),
    INDEX idx_place_vote_responses_member_id (member_id),
    CONSTRAINT fk_place_vote_responses_request FOREIGN KEY (vote_request_id) REFERENCES place_vote_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_place_vote_responses_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
