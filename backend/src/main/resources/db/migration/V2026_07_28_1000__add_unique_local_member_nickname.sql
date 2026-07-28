ALTER TABLE members
    ADD COLUMN local_nickname VARCHAR(50)
        GENERATED ALWAYS AS (CASE WHEN provider = 'LOCAL' THEN nickname ELSE NULL END) STORED,
    ADD CONSTRAINT uk_members_local_nickname UNIQUE (local_nickname);
