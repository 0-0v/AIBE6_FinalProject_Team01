-- 기본 카테고리를 시스템 고정 순서로 정규화하고 기존 사용자 카테고리는 기타 앞에 둔다.
UPDATE categories
SET sort_order = CASE category_type
    WHEN 'FOOD' THEN 0
    WHEN 'CAFE' THEN 1
    WHEN 'BAR' THEN 2
    WHEN 'ATTRACTION' THEN 3
    WHEN 'NATURE' THEN 4
    WHEN 'LODGING' THEN 5
    WHEN 'SHOPPING' THEN 6
    WHEN 'ACTIVITY' THEN 7
    WHEN 'TRANSPORT' THEN 8
    WHEN 'CUSTOM' THEN 90
    WHEN 'OTHER' THEN 100
    ELSE sort_order
END;
