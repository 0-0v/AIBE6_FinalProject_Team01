ALTER TABLE members
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER' AFTER status,
    ADD COLUMN suspension_reason VARCHAR(500) NULL AFTER role,
    ADD COLUMN suspended_at DATETIME NULL AFTER suspension_reason,
    ADD COLUMN suspended_until DATETIME NULL AFTER suspended_at,
    ADD COLUMN suspended_by BIGINT NULL AFTER suspended_until,
    ADD CONSTRAINT fk_members_suspended_by
        FOREIGN KEY (suspended_by) REFERENCES members (id) ON DELETE SET NULL;

CREATE INDEX idx_members_role_status ON members (role, status);
