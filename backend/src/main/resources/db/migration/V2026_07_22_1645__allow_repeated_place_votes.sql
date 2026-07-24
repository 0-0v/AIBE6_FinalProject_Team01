ALTER TABLE place_vote_requests
    DROP INDEX uk_place_vote_requests_trip_place,
    ADD INDEX idx_place_vote_requests_trip_place (trip_place_id);
