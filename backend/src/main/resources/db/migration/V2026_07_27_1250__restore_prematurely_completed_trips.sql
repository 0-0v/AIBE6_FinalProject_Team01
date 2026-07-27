CREATE TEMPORARY TABLE premature_completed_trip_ids (
    trip_id BIGINT PRIMARY KEY
);

INSERT INTO premature_completed_trip_ids (trip_id)
SELECT id
FROM trips
WHERE status = 'COMPLETED'
  AND (end_date IS NULL OR end_date >= CURRENT_DATE());

DELETE share_link
FROM plan_card_share_links share_link
JOIN plan_cards card ON card.id = share_link.plan_card_id
JOIN premature_completed_trip_ids premature ON premature.trip_id = card.trip_id;

DELETE card_tag
FROM plan_card_tags card_tag
JOIN plan_cards card ON card.id = card_tag.plan_card_id
JOIN premature_completed_trip_ids premature ON premature.trip_id = card.trip_id;

DELETE card
FROM plan_cards card
JOIN premature_completed_trip_ids premature ON premature.trip_id = card.trip_id;

DELETE trip_tag
FROM trip_tags trip_tag
JOIN premature_completed_trip_ids premature ON premature.trip_id = trip_tag.trip_id;

DELETE activity
FROM activity_logs activity
JOIN premature_completed_trip_ids premature ON premature.trip_id = activity.trip_id
WHERE activity.action_type = 'TRIP_COMPLETED';

UPDATE trips trip
JOIN premature_completed_trip_ids premature ON premature.trip_id = trip.id
SET trip.status = 'PLANNING';

DROP TEMPORARY TABLE premature_completed_trip_ids;
