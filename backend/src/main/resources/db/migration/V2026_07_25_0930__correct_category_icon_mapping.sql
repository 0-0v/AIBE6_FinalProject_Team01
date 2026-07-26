-- 이모지 문자열 비교 없이 카테고리 타입을 기준으로 기본 아이콘을 정확히 재매핑한다.
UPDATE categories
SET marker_icon = CASE category_type
    WHEN 'FOOD' THEN 'UTENSILS'
    WHEN 'CAFE' THEN 'COFFEE'
    WHEN 'ATTRACTION' THEN 'LANDMARK'
    WHEN 'NATURE' THEN 'TREES'
    WHEN 'LODGING' THEN 'HOTEL'
    WHEN 'SHOPPING' THEN 'SHOPPING_BAG'
    ELSE 'MAP_PIN'
END;
