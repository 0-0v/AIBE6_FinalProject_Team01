CREATE TABLE place_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_place_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_place_comments_trip_place_id (trip_place_id),
    CONSTRAINT fk_place_comments_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id) ON DELETE CASCADE,
    CONSTRAINT fk_place_comments_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
