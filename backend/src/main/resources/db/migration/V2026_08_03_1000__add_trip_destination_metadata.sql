ALTER TABLE trips
    ADD COLUMN destination_english_name VARCHAR(100) NULL AFTER destination_lng,
    ADD COLUMN destination_country_code VARCHAR(2) NULL AFTER destination_english_name;
