ALTER TABLE itinerary_items
    ADD CONSTRAINT uk_itinerary_items_trip_place UNIQUE (trip_place_id);
