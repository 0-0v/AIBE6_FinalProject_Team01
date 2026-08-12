CREATE TABLE trip_card_bookmark_shares (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    plan_card_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    shared_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_card_bookmark_shares_trip_card_member UNIQUE (trip_id, plan_card_id, member_id),
    INDEX idx_trip_card_bookmark_shares_trip_shared (trip_id, shared_at),
    CONSTRAINT fk_trip_card_bookmark_shares_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_card_bookmark_shares_card FOREIGN KEY (plan_card_id) REFERENCES plan_cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_card_bookmark_shares_member FOREIGN KEY (member_id) REFERENCES members(id)
);
