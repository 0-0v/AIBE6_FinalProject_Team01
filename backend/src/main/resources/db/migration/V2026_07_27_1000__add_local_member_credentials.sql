ALTER TABLE members
    ADD COLUMN password_hash VARCHAR(100) NULL AFTER provider_id,
    ADD COLUMN email_verified_at DATETIME NULL AFTER password_hash,
    ADD COLUMN local_email VARCHAR(255)
        GENERATED ALWAYS AS (CASE WHEN provider = 'LOCAL' THEN email ELSE NULL END) STORED,
    ADD CONSTRAINT uk_members_local_email UNIQUE (local_email);
