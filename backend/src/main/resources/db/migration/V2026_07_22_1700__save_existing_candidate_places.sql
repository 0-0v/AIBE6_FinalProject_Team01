UPDATE trip_places
SET status = CASE
    WHEN EXISTS (
        SELECT 1
        FROM place_vote_requests
        WHERE place_vote_requests.trip_place_id = trip_places.id
          AND place_vote_requests.status = 'OPEN'
    ) THEN 'HOLD'
    ELSE 'SAVED'
END
WHERE status = 'CANDIDATE';
