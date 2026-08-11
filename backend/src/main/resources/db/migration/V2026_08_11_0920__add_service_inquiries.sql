CREATE TABLE service_inquiries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NULL,
    category VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    answer TEXT NULL,
    answered_by BIGINT NULL,
    answered_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_service_inquiries_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_service_inquiries_answered_by FOREIGN KEY (answered_by) REFERENCES members (id),
    INDEX idx_service_inquiries_status_created (status, created_at),
    INDEX idx_service_inquiries_email_created (email, created_at)
);
