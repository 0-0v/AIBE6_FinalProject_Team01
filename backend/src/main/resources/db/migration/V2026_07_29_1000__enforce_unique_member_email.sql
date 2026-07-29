SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'members'
          AND INDEX_NAME = 'uk_members_email'
          AND NON_UNIQUE = 0
    ),
    'SELECT 1',
    'ALTER TABLE members ADD CONSTRAINT uk_members_email UNIQUE (email)'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
