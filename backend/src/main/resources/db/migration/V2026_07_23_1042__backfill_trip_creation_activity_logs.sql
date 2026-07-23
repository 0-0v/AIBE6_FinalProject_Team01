INSERT INTO activity_logs (
    trip_id,
    member_id,
    agent_run_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata_json,
    created_at
)
SELECT
    trips.id,
    trips.owner_id,
    NULL,
    'TRIP_CREATED',
    'TRIP',
    trips.id,
    '여행방을 생성했습니다.',
    JSON_OBJECT('title', trips.title, 'status', trips.status),
    trips.created_at
FROM trips
WHERE NOT EXISTS (
    SELECT 1
    FROM activity_logs
    WHERE activity_logs.trip_id = trips.id
      AND activity_logs.action_type = 'TRIP_CREATED'
);
