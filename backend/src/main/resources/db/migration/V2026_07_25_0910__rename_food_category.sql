-- 기존 기본 음식 카테고리 표시명을 변경한다.
UPDATE categories
SET name = '음식점'
WHERE category_type = 'FOOD'
  AND name = '맛집';
