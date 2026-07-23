UPDATE notifications
SET notification_type = 'VOTE',
    title = COALESCE(title, '장소 투표')
WHERE notification_type = 'PLACE_VOTE_REQUESTED';
