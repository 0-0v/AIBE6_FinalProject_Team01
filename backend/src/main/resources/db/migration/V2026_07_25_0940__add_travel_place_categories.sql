-- 기존 사용자 카테고리와 이름이 겹치면 해당 카테고리를 기본 유형으로 승격한다.
UPDATE categories
SET category_type = 'BAR',
    marker_icon = 'BEER'
WHERE category_type = 'CUSTOM'
  AND name = '술집';

UPDATE categories
SET category_type = 'ACTIVITY',
    marker_icon = 'STAR'
WHERE category_type = 'CUSTOM'
  AND name = '액티비티';

UPDATE categories
SET category_type = 'TRANSPORT',
    marker_icon = 'PLANE'
WHERE category_type = 'CUSTOM'
  AND name = '교통';

-- 기존 여행방에도 여행 목적에 맞는 술집, 액티비티, 교통 카테고리를 추가한다.
INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT t.id, '술집', 'BAR', '#be123c', 'BEER',
       COALESCE((SELECT MAX(c.sort_order) + 1 FROM categories c WHERE c.trip_id = t.id), 0)
FROM trips t
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = t.id AND c.category_type = 'BAR'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT t.id, '액티비티', 'ACTIVITY', '#ea580c', 'STAR',
       COALESCE((SELECT MAX(c.sort_order) + 1 FROM categories c WHERE c.trip_id = t.id), 0)
FROM trips t
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = t.id AND c.category_type = 'ACTIVITY'
);

INSERT INTO categories (trip_id, name, category_type, marker_color, marker_icon, sort_order)
SELECT t.id, '교통', 'TRANSPORT', '#475569', 'PLANE',
       COALESCE((SELECT MAX(c.sort_order) + 1 FROM categories c WHERE c.trip_id = t.id), 0)
FROM trips t
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.trip_id = t.id AND c.category_type = 'TRANSPORT'
);
