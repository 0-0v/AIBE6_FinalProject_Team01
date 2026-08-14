ALTER TABLE trip_invitations
    ADD COLUMN access_code VARCHAR(6) NULL AFTER invite_code,
    ADD COLUMN code_expires_at DATETIME(6) NULL AFTER access_code;

CREATE UNIQUE INDEX uk_trip_invitations_access_code
    ON trip_invitations (access_code);
