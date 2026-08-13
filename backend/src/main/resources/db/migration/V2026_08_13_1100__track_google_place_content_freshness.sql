ALTER TABLE places
    ADD COLUMN google_content_fetched_at DATETIME NULL AFTER opening_hours_json;

UPDATE places
SET google_content_fetched_at = COALESCE(updated_at, created_at)
WHERE google_content_fetched_at IS NULL;

ALTER TABLE places
    MODIFY COLUMN google_content_fetched_at DATETIME NOT NULL;

ALTER TABLE map_pins
    ADD COLUMN google_content_fetched_at DATETIME NULL AFTER place_name;

UPDATE map_pins
SET google_content_fetched_at = created_at
WHERE google_content_fetched_at IS NULL;

ALTER TABLE map_pins
    MODIFY COLUMN google_content_fetched_at DATETIME NOT NULL;
