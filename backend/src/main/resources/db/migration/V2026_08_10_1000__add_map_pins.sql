CREATE TABLE map_pins (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    google_place_id VARCHAR(255) NOT NULL,
    lat DOUBLE NOT NULL,
    lng DOUBLE NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_map_pins_trip_place (trip_id, google_place_id),
    CONSTRAINT fk_map_pins_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE map_pin_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    map_pin_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_map_pin_comments_map_pin_id (map_pin_id),
    CONSTRAINT fk_map_pin_comments_map_pin FOREIGN KEY (map_pin_id) REFERENCES map_pins (id) ON DELETE CASCADE,
    CONSTRAINT fk_map_pin_comments_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
