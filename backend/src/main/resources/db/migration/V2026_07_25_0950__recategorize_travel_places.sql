-- 자동 분류 유형이 추가되기 전에 기타로 저장된 장소만 새 기본 카테고리로 보정한다.
UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'BAR'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND p.place_type IN ('bar', 'pub', 'night_club');

UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'TRANSPORT'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND p.place_type IN (
      'airport',
      'train_station',
      'transit_station',
      'bus_station',
      'subway_station',
      'ferry_terminal',
      'taxi_stand',
      'car_rental'
  );

UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'ACTIVITY'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND p.place_type IN (
      'amusement_center',
      'amusement_park',
      'water_park',
      'aquarium',
      'zoo',
      'bowling_alley',
      'ski_resort',
      'golf_course',
      'sports_complex',
      'spa'
  );
