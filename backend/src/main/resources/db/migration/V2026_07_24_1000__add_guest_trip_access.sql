CREATE TABLE guest_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    claimed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_guest_sessions_token_hash UNIQUE (token_hash),
    INDEX idx_guest_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_guest_members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    guest_session_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    joined_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_guest_members_trip_guest UNIQUE (trip_id, guest_session_id),
    INDEX idx_trip_guest_members_guest_session_id (guest_session_id),
    CONSTRAINT fk_trip_guest_members_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_guest_members_guest_session FOREIGN KEY (guest_session_id)
        REFERENCES guest_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
