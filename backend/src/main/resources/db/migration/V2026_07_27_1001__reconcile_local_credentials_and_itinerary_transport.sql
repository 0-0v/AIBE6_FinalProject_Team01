-- V2026_07_27_1000 was independently assigned to local-member credentials
-- and itinerary transport distance. Keep the member migration canonical and
-- reconcile databases that may already contain either side of that collision.

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'members'
          AND COLUMN_NAME = 'password_hash'
    ),
    'SELECT 1',
    'ALTER TABLE members ADD COLUMN password_hash VARCHAR(100) NULL AFTER provider_id'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'members'
          AND COLUMN_NAME = 'email_verified_at'
    ),
    'SELECT 1',
    'ALTER TABLE members ADD COLUMN email_verified_at DATETIME NULL AFTER password_hash'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'members'
          AND COLUMN_NAME = 'local_email'
    ),
    'SELECT 1',
    'ALTER TABLE members ADD COLUMN local_email VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN provider = ''LOCAL'' THEN email ELSE NULL END) STORED'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'members'
          AND CONSTRAINT_NAME = 'uk_members_local_email'
    ),
    'SELECT 1',
    'ALTER TABLE members ADD CONSTRAINT uk_members_local_email UNIQUE (local_email)'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'itinerary_items'
          AND COLUMN_NAME = 'transport_meters'
    ),
    'SELECT 1',
    'ALTER TABLE itinerary_items ADD COLUMN transport_meters INT NULL COMMENT ''이동 거리(미터)'' AFTER transport_minutes'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
