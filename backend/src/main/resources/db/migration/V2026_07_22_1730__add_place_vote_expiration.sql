ALTER TABLE place_vote_requests
    ADD COLUMN expires_at DATETIME NULL AFTER created_at;

UPDATE place_vote_requests
SET expires_at = DATE_ADD(created_at, INTERVAL 24 HOUR)
WHERE expires_at IS NULL;

ALTER TABLE place_vote_requests
    MODIFY COLUMN expires_at DATETIME NOT NULL;

CREATE INDEX idx_place_vote_requests_status_expires_at
    ON place_vote_requests (status, expires_at);
