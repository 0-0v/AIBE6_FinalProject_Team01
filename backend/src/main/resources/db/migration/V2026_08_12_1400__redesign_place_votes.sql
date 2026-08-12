ALTER TABLE place_vote_requests
    ADD COLUMN secondary_trip_place_id BIGINT NULL,
    ADD COLUMN vote_type VARCHAR(30) NOT NULL DEFAULT 'PLACE_APPROVAL',
    ADD COLUMN title VARCHAR(30) NULL,
    ADD COLUMN creator_comment VARCHAR(500) NULL,
    ADD COLUMN primary_ai_description TEXT NULL,
    ADD COLUMN secondary_ai_description TEXT NULL,
    ADD COLUMN comparison_summary TEXT NULL,
    ADD COLUMN result VARCHAR(30) NULL,
    ADD COLUMN winner_trip_place_id BIGINT NULL;

UPDATE place_vote_requests request
JOIN trip_places place ON place.id = request.trip_place_id
SET request.result = CASE
        WHEN place.status = 'SAVED' THEN 'SELECTED'
        ELSE 'NOT_SELECTED'
    END,
    request.winner_trip_place_id = CASE
        WHEN place.status = 'SAVED' THEN request.trip_place_id
        ELSE NULL
    END
WHERE request.status = 'CLOSED';

ALTER TABLE place_vote_requests
    ADD CONSTRAINT fk_place_vote_secondary_trip_place
        FOREIGN KEY (secondary_trip_place_id) REFERENCES trip_places(id),
    ADD CONSTRAINT fk_place_vote_winner_trip_place
        FOREIGN KEY (winner_trip_place_id) REFERENCES trip_places(id);
