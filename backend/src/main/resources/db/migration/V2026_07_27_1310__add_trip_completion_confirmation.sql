ALTER TABLE trips
    ADD COLUMN completion_confirmed_at DATETIME NULL AFTER visibility;

UPDATE trips
SET completion_confirmed_at = updated_at
WHERE status = 'COMPLETED';
