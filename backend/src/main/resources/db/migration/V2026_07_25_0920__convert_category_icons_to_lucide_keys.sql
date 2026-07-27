-- 카테고리 이모지를 프론트에서 렌더링할 Lucide 아이콘 키로 변환한다.
UPDATE categories
SET marker_icon = CASE
    WHEN marker_icon = '🍽️' OR category_type = 'FOOD' THEN 'UTENSILS'
    WHEN marker_icon = '☕️' OR category_type = 'CAFE' THEN 'COFFEE'
    WHEN marker_icon = '🏛️' OR category_type = 'ATTRACTION' THEN 'LANDMARK'
    WHEN marker_icon = '🌿' OR category_type = 'NATURE' THEN 'TREES'
    WHEN marker_icon = '🏨' OR category_type = 'LODGING' THEN 'HOTEL'
    WHEN marker_icon = '🛍️' OR category_type = 'SHOPPING' THEN 'SHOPPING_BAG'
    ELSE 'MAP_PIN'
END;
