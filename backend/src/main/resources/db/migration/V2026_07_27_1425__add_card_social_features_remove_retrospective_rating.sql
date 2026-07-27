CREATE TABLE card_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    plan_card_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_card_comments_plan_card_created (plan_card_id, created_at),
    INDEX idx_card_comments_member_id (member_id),
    CONSTRAINT fk_card_comments_plan_card FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id) ON DELETE CASCADE,
    CONSTRAINT fk_card_comments_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE trip_retrospectives
    DROP COLUMN rating;
