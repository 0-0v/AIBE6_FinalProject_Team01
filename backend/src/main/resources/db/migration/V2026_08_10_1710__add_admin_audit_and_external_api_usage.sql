CREATE TABLE admin_action_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    admin_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_admin_action_logs_admin FOREIGN KEY (admin_id) REFERENCES members (id),
    INDEX idx_admin_action_logs_created_at (created_at),
    INDEX idx_admin_action_logs_target (target_type, target_id, created_at)
);

CREATE TABLE external_api_usages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NULL,
    provider VARCHAR(30) NOT NULL,
    operation VARCHAR(80) NOT NULL,
    success BOOLEAN NOT NULL,
    input_tokens INT NULL,
    output_tokens INT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_external_api_usages_member FOREIGN KEY (member_id) REFERENCES members (id),
    INDEX idx_external_api_usages_member_created (member_id, created_at),
    INDEX idx_external_api_usages_provider_created (provider, created_at)
);
