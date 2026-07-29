ALTER TABLE members
    ADD COLUMN personal_info_expires_at DATETIME NULL AFTER withdrawn_at,
    ADD COLUMN personal_info_deleted_at DATETIME NULL AFTER personal_info_expires_at,
    ADD INDEX idx_members_personal_info_expiration (
        status,
        personal_info_expires_at,
        personal_info_deleted_at
    );
