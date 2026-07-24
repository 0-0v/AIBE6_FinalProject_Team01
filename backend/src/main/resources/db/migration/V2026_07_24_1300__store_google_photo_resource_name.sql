ALTER TABLE places
    ADD COLUMN google_photo_name VARCHAR(1000) NULL AFTER place_type;

-- 기존 image_url에는 API 키가 포함된 Google Media URL이 저장될 수 있으므로 제거한다.
UPDATE places
SET image_url = NULL
WHERE image_url LIKE 'https://places.googleapis.com/%';
