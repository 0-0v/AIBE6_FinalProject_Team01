CREATE TABLE trip_date_availabilities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    available_date DATE NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_date_availability UNIQUE (trip_id, member_id, available_date),
    INDEX idx_trip_date_availabilities_trip_date (trip_id, available_date),
    CONSTRAINT fk_trip_date_availability_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_date_availability_member FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_date_proposals (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    proposed_by BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_date_proposal_trip UNIQUE (trip_id),
    CONSTRAINT fk_trip_date_proposal_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_date_proposal_member FOREIGN KEY (proposed_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_date_votes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    proposal_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    choice VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_date_vote_member UNIQUE (proposal_id, member_id),
    CONSTRAINT fk_trip_date_vote_proposal FOREIGN KEY (proposal_id) REFERENCES trip_date_proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_date_vote_member FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
