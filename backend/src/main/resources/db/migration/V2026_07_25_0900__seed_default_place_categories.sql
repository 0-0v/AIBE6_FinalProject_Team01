-- 기존 여행방에 기본 카테고리를 생성하고 모든 장소에 하나의 카테고리를 보장한다.
INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '맛집', 'FOOD', '#dc2626', '🍽️', 0 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'FOOD'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '카페', 'CAFE', '#b45309', '☕️', 1 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'CAFE'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '명소', 'ATTRACTION', '#7c3aed', '🏛️', 2 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'ATTRACTION'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '자연', 'NATURE', '#0f766e', '🌿', 3 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'NATURE'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '숙소', 'LODGING', '#0891b2', '🏨', 4 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'LODGING'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '쇼핑', 'SHOPPING', '#2563eb', '🛍️', 5 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'SHOPPING'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT id, '기타', 'OTHER', '#64748b', '📍', 6 FROM trips
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = trips.id AND c.category_type = 'OTHER'
);

UPDATE trip_places tp
JOIN categories c ON c.trip_id = tp.trip_id AND c.category_type = 'OTHER'
SET tp.category_id = c.id
WHERE tp.category_id IS NULL;

ALTER TABLE trip_places
    MODIFY COLUMN category_id BIGINT NOT NULL;
