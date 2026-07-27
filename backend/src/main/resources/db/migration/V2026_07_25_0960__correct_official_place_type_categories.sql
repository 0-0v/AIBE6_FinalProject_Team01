-- 과거 분류 규칙에서 기타로 저장된 명확한 Google 공식 타입을 보정한다.
UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'FOOD'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND (p.place_type = 'restaurant' OR p.place_type REGEXP '_restaurant$');

UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'ATTRACTION'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND p.place_type IN (
      'castle',
      'cultural_landmark',
      'historical_landmark',
      'historical_place',
      'monument',
      'observation_deck'
  );

UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'NATURE'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND p.place_type IN (
      'island',
      'lake',
      'mountain_peak',
      'nature_preserve',
      'river',
      'scenic_spot',
      'woods'
  );

UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'LODGING'
SET tp.category_id = target_category.id
WHERE current_category.category_type = 'OTHER'
  AND p.place_type IN (
      'budget_japanese_inn',
      'camping_cabin',
      'cottage',
      'farmstay',
      'inn',
      'japanese_inn',
      'mobile_home_park',
      'private_guest_room',
      'resort_hotel'
  );

-- park 문자열에 걸려 자연으로 저장됐던 주차장 유형을 교통으로 바로잡는다.
UPDATE trip_places tp
JOIN places p ON p.id = tp.place_id
JOIN categories current_category ON current_category.id = tp.category_id
JOIN categories target_category
  ON target_category.trip_id = tp.trip_id
 AND target_category.category_type = 'TRANSPORT'
SET tp.category_id = target_category.id
WHERE current_category.category_type IN ('OTHER', 'NATURE')
  AND p.place_type IN ('parking', 'parking_garage', 'parking_lot', 'park_and_ride');
