SET @opening_hours_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'places'
      AND column_name = 'opening_hours_json'
);

SET @opening_hours_migration_sql = IF(
    @opening_hours_column_exists = 0,
    'ALTER TABLE places ADD COLUMN opening_hours_json TEXT NULL COMMENT ''Google Places API opening_hours JSON''',
    'ALTER TABLE places MODIFY COLUMN opening_hours_json TEXT NULL COMMENT ''Google Places API opening_hours JSON'''
);

PREPARE opening_hours_migration_statement
    FROM @opening_hours_migration_sql;
EXECUTE opening_hours_migration_statement;
DEALLOCATE PREPARE opening_hours_migration_statement;
