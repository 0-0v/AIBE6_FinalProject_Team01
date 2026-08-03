UPDATE categories
SET sort_order = CASE category_type
    WHEN 'ACTIVITY' THEN 8
    WHEN 'TRANSPORT' THEN 9
    ELSE sort_order
END
WHERE category_type IN ('ACTIVITY', 'TRANSPORT');

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '편의점', 'CONVENIENCE', '#16a34a', 'STORE', 7
FROM trips
WHERE NOT EXISTS (
    SELECT 1
    FROM categories
    WHERE categories.trip_id = trips.id
      AND categories.category_type = 'CONVENIENCE'
);
