ALTER TABLE trips
    MODIFY COLUMN destination VARCHAR(100) NULL,
    ADD COLUMN companion_type VARCHAR(30) NULL AFTER transport_type;

CREATE TABLE trip_travel_styles (
    trip_id BIGINT NOT NULL,
    travel_style VARCHAR(30) NOT NULL,
    PRIMARY KEY (trip_id, travel_style),
    CONSTRAINT fk_trip_travel_styles_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO trip_travel_styles (trip_id, travel_style)
SELECT id, travel_style
FROM trips
WHERE travel_style IS NOT NULL;
