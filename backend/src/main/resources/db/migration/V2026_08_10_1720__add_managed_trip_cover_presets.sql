CREATE TABLE trip_cover_presets (
    id BIGINT NOT NULL AUTO_INCREMENT,
    preset_key VARCHAR(50) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL,
    created_by BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_cover_presets_key UNIQUE (preset_key),
    CONSTRAINT fk_trip_cover_presets_created_by FOREIGN KEY (created_by) REFERENCES members (id),
    INDEX idx_trip_cover_presets_active_sort (active, sort_order)
);

INSERT INTO trip_cover_presets
    (preset_key, image_url, active, sort_order, created_by, created_at, updated_at)
VALUES
    ('PRESET_1', '/assets/trip-covers/trip-cover-01.jpg', TRUE, 1, NULL, NOW(6), NOW(6)),
    ('PRESET_2', '/assets/trip-covers/trip-cover-02.jpg', TRUE, 2, NULL, NOW(6), NOW(6)),
    ('PRESET_3', '/assets/trip-covers/trip-cover-03.jpg', TRUE, 3, NULL, NOW(6), NOW(6)),
    ('PRESET_4', '/assets/trip-covers/trip-cover-04.jpg', TRUE, 4, NULL, NOW(6), NOW(6)),
    ('PRESET_5', '/assets/trip-covers/trip-cover-05.jpg', TRUE, 5, NULL, NOW(6), NOW(6)),
    ('PRESET_6', '/assets/trip-covers/trip-cover-06.jpg', TRUE, 6, NULL, NOW(6), NOW(6)),
    ('PRESET_7', '/assets/trip-covers/trip-cover-07.jpg', TRUE, 7, NULL, NOW(6), NOW(6)),
    ('PRESET_8', '/assets/trip-covers/trip-cover-08.jpg', TRUE, 8, NULL, NOW(6), NOW(6)),
    ('PRESET_9', '/assets/trip-covers/trip-cover-09.jpg', TRUE, 9, NULL, NOW(6), NOW(6)),
    ('PRESET_10', '/assets/trip-covers/trip-cover-10.jpg', TRUE, 10, NULL, NOW(6), NOW(6)),
    ('PRESET_11', '/assets/trip-covers/trip-cover-11.jpg', TRUE, 11, NULL, NOW(6), NOW(6));
