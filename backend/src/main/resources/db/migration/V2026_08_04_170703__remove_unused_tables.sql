ALTER TABLE activity_logs
    DROP FOREIGN KEY fk_activity_logs_agent_run_cascade,
    DROP COLUMN agent_run_id;

DROP TABLE IF EXISTS route_validations;
DROP TABLE IF EXISTS agent_proposals;
DROP TABLE IF EXISTS agent_runs;

DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS itinerary_executions;
DROP TABLE IF EXISTS meeting_point_candidates;
DROP TABLE IF EXISTS member_availabilities;
DROP TABLE IF EXISTS member_departures;
DROP TABLE IF EXISTS place_preferences;
DROP TABLE IF EXISTS place_reviews;
DROP TABLE IF EXISTS plan_card_share_links;
DROP TABLE IF EXISTS trip_copies;
DROP TABLE IF EXISTS trip_date_candidates;
DROP TABLE IF EXISTS trip_share_links;
