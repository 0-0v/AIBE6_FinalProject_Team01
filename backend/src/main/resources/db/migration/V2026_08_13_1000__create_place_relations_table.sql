CREATE TABLE place_relations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    from_place_id BIGINT NOT NULL,
    to_place_id BIGINT NOT NULL,
    co_visit_count INT NOT NULL DEFAULT 0,
    computed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_relations_pair UNIQUE (from_place_id, to_place_id),
    INDEX idx_place_relations_from (from_place_id),
    INDEX idx_place_relations_to (to_place_id),
    CONSTRAINT fk_place_relations_from FOREIGN KEY (from_place_id) REFERENCES places(id) ON DELETE CASCADE,
    CONSTRAINT fk_place_relations_to FOREIGN KEY (to_place_id) REFERENCES places(id) ON DELETE CASCADE
);
