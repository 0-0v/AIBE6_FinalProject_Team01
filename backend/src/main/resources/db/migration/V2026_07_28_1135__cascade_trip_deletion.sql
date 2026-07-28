-- 마지막 멤버가 여행방을 물리 삭제할 때 연관 데이터도 함께 정리한다.
-- 하위 테이블부터 CASCADE를 적용해 다단계 외래키가 삭제를 막지 않도록 한다.

ALTER TABLE place_preferences
    DROP FOREIGN KEY fk_place_preferences_trip_place,
    ADD CONSTRAINT fk_place_preferences_trip_place_cascade
        FOREIGN KEY (trip_place_id) REFERENCES trip_places (id) ON DELETE CASCADE;

ALTER TABLE itinerary_items
    DROP FOREIGN KEY fk_itinerary_items_day,
    DROP FOREIGN KEY fk_itinerary_items_trip_place,
    ADD CONSTRAINT fk_itinerary_items_day_cascade
        FOREIGN KEY (itinerary_day_id) REFERENCES itinerary_days (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_itinerary_items_trip_place_cascade
        FOREIGN KEY (trip_place_id) REFERENCES trip_places (id) ON DELETE CASCADE;

ALTER TABLE trip_places
    DROP FOREIGN KEY fk_trip_places_category,
    ADD CONSTRAINT fk_trip_places_category_cascade
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE;

ALTER TABLE itinerary_executions
    DROP FOREIGN KEY fk_itinerary_executions_item,
    ADD CONSTRAINT fk_itinerary_executions_item_cascade
        FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id) ON DELETE CASCADE;

ALTER TABLE agent_proposals
    DROP FOREIGN KEY fk_agent_proposals_run,
    ADD CONSTRAINT fk_agent_proposals_run_cascade
        FOREIGN KEY (agent_run_id) REFERENCES agent_runs (id) ON DELETE CASCADE;

ALTER TABLE route_validations
    DROP FOREIGN KEY fk_route_validations_proposal,
    DROP FOREIGN KEY fk_route_validations_itinerary_item,
    ADD CONSTRAINT fk_route_validations_proposal_cascade
        FOREIGN KEY (proposal_id) REFERENCES agent_proposals (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_route_validations_itinerary_item_cascade
        FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id) ON DELETE CASCADE;

ALTER TABLE activity_logs
    DROP FOREIGN KEY fk_activity_logs_agent_run,
    ADD CONSTRAINT fk_activity_logs_agent_run_cascade
        FOREIGN KEY (agent_run_id) REFERENCES agent_runs (id) ON DELETE CASCADE;

ALTER TABLE expense_participants
    DROP FOREIGN KEY fk_expense_participants_expense,
    ADD CONSTRAINT fk_expense_participants_expense_cascade
        FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE;

ALTER TABLE travel_photos
    DROP FOREIGN KEY fk_travel_photos_record,
    ADD CONSTRAINT fk_travel_photos_record_cascade
        FOREIGN KEY (travel_record_id) REFERENCES travel_records (id) ON DELETE CASCADE;

ALTER TABLE travel_records
    DROP FOREIGN KEY fk_travel_records_itinerary_item,
    ADD CONSTRAINT fk_travel_records_itinerary_item_cascade
        FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id) ON DELETE CASCADE;

ALTER TABLE place_reviews
    DROP FOREIGN KEY fk_place_reviews_record,
    ADD CONSTRAINT fk_place_reviews_record_cascade
        FOREIGN KEY (travel_record_id) REFERENCES travel_records (id) ON DELETE CASCADE;

ALTER TABLE plan_card_tags
    DROP FOREIGN KEY fk_plan_card_tags_card,
    DROP FOREIGN KEY fk_plan_card_tags_tag,
    ADD CONSTRAINT fk_plan_card_tags_card_cascade
        FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_plan_card_tags_tag_cascade
        FOREIGN KEY (tag_id) REFERENCES trip_tags (id) ON DELETE CASCADE;

ALTER TABLE plan_card_share_links
    DROP FOREIGN KEY fk_plan_card_share_links_card,
    ADD CONSTRAINT fk_plan_card_share_links_card_cascade
        FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id) ON DELETE CASCADE;

ALTER TABLE trip_members
    DROP FOREIGN KEY fk_trip_members_trip,
    ADD CONSTRAINT fk_trip_members_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_invitations
    DROP FOREIGN KEY fk_trip_invitations_trip,
    ADD CONSTRAINT fk_trip_invitations_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE categories
    DROP FOREIGN KEY fk_categories_trip,
    ADD CONSTRAINT fk_categories_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_places
    DROP FOREIGN KEY fk_trip_places_trip,
    ADD CONSTRAINT fk_trip_places_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE itinerary_days
    DROP FOREIGN KEY fk_itinerary_days_trip,
    ADD CONSTRAINT fk_itinerary_days_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE agent_runs
    DROP FOREIGN KEY fk_agent_runs_trip,
    ADD CONSTRAINT fk_agent_runs_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE activity_logs
    DROP FOREIGN KEY fk_activity_logs_trip,
    ADD CONSTRAINT fk_activity_logs_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE notifications
    DROP FOREIGN KEY fk_notifications_trip,
    ADD CONSTRAINT fk_notifications_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE expenses
    DROP FOREIGN KEY fk_expenses_trip,
    ADD CONSTRAINT fk_expenses_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE settlements
    DROP FOREIGN KEY fk_settlements_trip,
    ADD CONSTRAINT fk_settlements_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_tags
    DROP FOREIGN KEY fk_trip_tags_trip,
    ADD CONSTRAINT fk_trip_tags_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE plan_cards
    DROP FOREIGN KEY fk_plan_cards_trip,
    ADD CONSTRAINT fk_plan_cards_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_share_links
    DROP FOREIGN KEY fk_trip_share_links_trip,
    ADD CONSTRAINT fk_trip_share_links_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_copies
    DROP FOREIGN KEY fk_trip_copies_source_trip,
    DROP FOREIGN KEY fk_trip_copies_copied_trip,
    ADD CONSTRAINT fk_trip_copies_source_trip_cascade
        FOREIGN KEY (source_trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_trip_copies_copied_trip_cascade
        FOREIGN KEY (copied_trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE member_availabilities
    DROP FOREIGN KEY fk_member_availabilities_trip,
    ADD CONSTRAINT fk_member_availabilities_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_date_candidates
    DROP FOREIGN KEY fk_trip_date_candidates_trip,
    ADD CONSTRAINT fk_trip_date_candidates_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE member_departures
    DROP FOREIGN KEY fk_member_departures_trip,
    ADD CONSTRAINT fk_member_departures_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE meeting_point_candidates
    DROP FOREIGN KEY fk_meeting_point_candidates_trip,
    ADD CONSTRAINT fk_meeting_point_candidates_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE budgets
    DROP FOREIGN KEY fk_budgets_trip,
    ADD CONSTRAINT fk_budgets_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE travel_records
    DROP FOREIGN KEY fk_travel_records_trip,
    ADD CONSTRAINT fk_travel_records_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_retrospectives
    DROP FOREIGN KEY fk_trip_retrospectives_trip,
    ADD CONSTRAINT fk_trip_retrospectives_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE saved_trips
    DROP FOREIGN KEY fk_saved_trips_trip,
    ADD CONSTRAINT fk_saved_trips_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;

ALTER TABLE trip_guest_members
    DROP FOREIGN KEY fk_trip_guest_members_trip,
    ADD CONSTRAINT fk_trip_guest_members_trip_cascade
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE;
