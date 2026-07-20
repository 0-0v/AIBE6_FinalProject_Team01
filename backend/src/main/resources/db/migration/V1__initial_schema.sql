CREATE TABLE members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    profile_image_url VARCHAR(500) NULL,
    provider VARCHAR(20) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_login_at DATETIME NULL,
    withdrawn_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_members_email UNIQUE (email),
    CONSTRAINT uk_members_provider_id UNIQUE (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trips (
    id BIGINT NOT NULL AUTO_INCREMENT,
    owner_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cover_image_url VARCHAR(500) NULL,
    transport_type VARCHAR(30) NULL,
    status VARCHAR(20) NOT NULL,
    budget_per_person DECIMAL(12, 2) NULL,
    total_budget DECIMAL(12, 2) NULL,
    visibility VARCHAR(20) NOT NULL,
    view_count BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_trips_owner_id (owner_id),
    CONSTRAINT fk_trips_owner FOREIGN KEY (owner_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    joined_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_members_trip_member UNIQUE (trip_id, member_id),
    INDEX idx_trip_members_member_id (member_id),
    CONSTRAINT fk_trip_members_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_members_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_invitations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    invite_code VARCHAR(100) NOT NULL,
    created_by BIGINT NOT NULL,
    expires_at DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_invitations_invite_code UNIQUE (invite_code),
    INDEX idx_trip_invitations_trip_id (trip_id),
    INDEX idx_trip_invitations_created_by (created_by),
    CONSTRAINT fk_trip_invitations_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_invitations_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE places (
    id BIGINT NOT NULL AUTO_INCREMENT,
    google_place_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    place_type VARCHAR(100) NULL,
    opening_hours_json JSON NULL,
    image_url VARCHAR(500) NULL,
    website_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_places_google_place_id UNIQUE (google_place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    category_type VARCHAR(30) NOT NULL,
    marker_color VARCHAR(20) NOT NULL,
    marker_icon VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_categories_trip_name UNIQUE (trip_id, name),
    CONSTRAINT fk_categories_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_places (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    place_id BIGINT NOT NULL,
    category_id BIGINT NULL,
    added_by BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    priority INT NULL,
    user_note TEXT NULL,
    ai_note TEXT NULL,
    preferred_time VARCHAR(30) NULL,
    estimated_stay_minutes INT NULL,
    marker_color VARCHAR(20) NULL,
    marker_icon VARCHAR(50) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_places_trip_place UNIQUE (trip_id, place_id),
    INDEX idx_trip_places_place_id (place_id),
    INDEX idx_trip_places_category_id (category_id),
    INDEX idx_trip_places_added_by (added_by),
    CONSTRAINT fk_trip_places_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_places_place FOREIGN KEY (place_id) REFERENCES places (id),
    CONSTRAINT fk_trip_places_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_trip_places_added_by FOREIGN KEY (added_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_preferences (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_place_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    preference_type VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_place_preferences_place_member UNIQUE (trip_place_id, member_id),
    INDEX idx_place_preferences_member_id (member_id),
    CONSTRAINT fk_place_preferences_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id),
    CONSTRAINT fk_place_preferences_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_place_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_place_comments_trip_place_id (trip_place_id),
    INDEX idx_place_comments_member_id (member_id),
    CONSTRAINT fk_place_comments_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id),
    CONSTRAINT fk_place_comments_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerary_days (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    itinerary_date DATE NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(100) NULL,
    description TEXT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_itinerary_days_trip_date UNIQUE (trip_id, itinerary_date),
    CONSTRAINT fk_itinerary_days_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerary_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    itinerary_day_id BIGINT NOT NULL,
    trip_place_id BIGINT NULL,
    title VARCHAR(100) NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    sort_order INT NOT NULL,
    transport_minutes INT NULL,
    memo TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_itinerary_items_day_id (itinerary_day_id),
    INDEX idx_itinerary_items_trip_place_id (trip_place_id),
    CONSTRAINT fk_itinerary_items_day FOREIGN KEY (itinerary_day_id) REFERENCES itinerary_days (id),
    CONSTRAINT fk_itinerary_items_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE agent_runs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    agent_type VARCHAR(30) NOT NULL,
    user_request TEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    plan_json JSON NULL,
    result_json JSON NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_agent_runs_trip_id (trip_id),
    INDEX idx_agent_runs_requested_by (requested_by),
    CONSTRAINT fk_agent_runs_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_agent_runs_requester FOREIGN KEY (requested_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE agent_proposals (
    id BIGINT NOT NULL AUTO_INCREMENT,
    agent_run_id BIGINT NOT NULL,
    proposal_type VARCHAR(30) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NULL,
    before_json JSON NULL,
    after_json JSON NOT NULL,
    reason TEXT NOT NULL,
    confidence DECIMAL(5, 4) NULL,
    approval_status VARCHAR(20) NOT NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_agent_proposals_agent_run_id (agent_run_id),
    INDEX idx_agent_proposals_reviewed_by (reviewed_by),
    CONSTRAINT fk_agent_proposals_run FOREIGN KEY (agent_run_id) REFERENCES agent_runs (id),
    CONSTRAINT fk_agent_proposals_reviewer FOREIGN KEY (reviewed_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    member_id BIGINT NULL,
    agent_run_id BIGINT NULL,
    action_type VARCHAR(30) NOT NULL,
    target_type VARCHAR(30) NULL,
    target_id BIGINT NULL,
    description VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_activity_logs_trip_id (trip_id),
    INDEX idx_activity_logs_member_id (member_id),
    INDEX idx_activity_logs_agent_run_id (agent_run_id),
    CONSTRAINT fk_activity_logs_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_activity_logs_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_activity_logs_agent_run FOREIGN KEY (agent_run_id) REFERENCES agent_runs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_rooms (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_chat_rooms_trip_id UNIQUE (trip_id),
    CONSTRAINT fk_chat_rooms_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    trip_id BIGINT NULL,
    notification_type VARCHAR(30) NOT NULL,
    content VARCHAR(500) NOT NULL,
    target_type VARCHAR(30) NULL,
    target_id BIGINT NULL,
    is_read BOOLEAN NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_notifications_member_id (member_id),
    INDEX idx_notifications_trip_id (trip_id),
    CONSTRAINT fk_notifications_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_notifications_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expenses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    payer_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    split_type VARCHAR(20) NOT NULL,
    receipt_url VARCHAR(500) NULL,
    memo TEXT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_expenses_trip_id (trip_id),
    INDEX idx_expenses_payer_id (payer_id),
    INDEX idx_expenses_created_by (created_by),
    CONSTRAINT fk_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_expenses_payer FOREIGN KEY (payer_id) REFERENCES members (id),
    CONSTRAINT fk_expenses_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expense_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    expense_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    share_amount DECIMAL(12, 2) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_expense_participants_expense_member UNIQUE (expense_id, member_id),
    INDEX idx_expense_participants_member_id (member_id),
    CONSTRAINT fk_expense_participants_expense FOREIGN KEY (expense_id) REFERENCES expenses (id),
    CONSTRAINT fk_expense_participants_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settlements (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    sent_at DATETIME NULL,
    confirmed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_settlements_trip_id (trip_id),
    INDEX idx_settlements_sender_id (sender_id),
    INDEX idx_settlements_receiver_id (receiver_id),
    CONSTRAINT fk_settlements_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_settlements_sender FOREIGN KEY (sender_id) REFERENCES members (id),
    CONSTRAINT fk_settlements_receiver FOREIGN KEY (receiver_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_tags (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NULL,
    icon VARCHAR(50) NULL,
    created_by BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_tags_trip_name UNIQUE (trip_id, name),
    INDEX idx_trip_tags_created_by (created_by),
    CONSTRAINT fk_trip_tags_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_tags_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plan_cards (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    card_type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    trip_place_id BIGINT NULL,
    itinerary_item_id BIGINT NULL,
    expense_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_plan_cards_trip_id (trip_id),
    INDEX idx_plan_cards_trip_place_id (trip_place_id),
    INDEX idx_plan_cards_itinerary_item_id (itinerary_item_id),
    INDEX idx_plan_cards_expense_id (expense_id),
    INDEX idx_plan_cards_created_by (created_by),
    CONSTRAINT fk_plan_cards_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_plan_cards_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id),
    CONSTRAINT fk_plan_cards_itinerary_item FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id),
    CONSTRAINT fk_plan_cards_expense FOREIGN KEY (expense_id) REFERENCES expenses (id),
    CONSTRAINT fk_plan_cards_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plan_card_tags (
    id BIGINT NOT NULL AUTO_INCREMENT,
    plan_card_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_plan_card_tags_card_tag UNIQUE (plan_card_id, tag_id),
    INDEX idx_plan_card_tags_tag_id (tag_id),
    CONSTRAINT fk_plan_card_tags_card FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id),
    CONSTRAINT fk_plan_card_tags_tag FOREIGN KEY (tag_id) REFERENCES trip_tags (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    chat_room_id BIGINT NOT NULL,
    sender_id BIGINT NULL,
    message_type VARCHAR(30) NOT NULL,
    content TEXT NULL,
    file_url VARCHAR(500) NULL,
    trip_place_id BIGINT NULL,
    plan_card_id BIGINT NULL,
    expense_id BIGINT NULL,
    created_at DATETIME NOT NULL,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_chat_messages_room_created (chat_room_id, created_at),
    INDEX idx_chat_messages_sender_id (sender_id),
    INDEX idx_chat_messages_trip_place_id (trip_place_id),
    INDEX idx_chat_messages_plan_card_id (plan_card_id),
    INDEX idx_chat_messages_expense_id (expense_id),
    CONSTRAINT fk_chat_messages_room FOREIGN KEY (chat_room_id) REFERENCES chat_rooms (id),
    CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES members (id),
    CONSTRAINT fk_chat_messages_trip_place FOREIGN KEY (trip_place_id) REFERENCES trip_places (id),
    CONSTRAINT fk_chat_messages_plan_card FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id),
    CONSTRAINT fk_chat_messages_expense FOREIGN KEY (expense_id) REFERENCES expenses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_message_reads (
    id BIGINT NOT NULL AUTO_INCREMENT,
    chat_room_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    last_read_message_id BIGINT NULL,
    last_read_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_chat_message_reads_room_member UNIQUE (chat_room_id, member_id),
    INDEX idx_chat_message_reads_member_id (member_id),
    INDEX idx_chat_message_reads_last_message_id (last_read_message_id),
    CONSTRAINT fk_chat_message_reads_room FOREIGN KEY (chat_room_id) REFERENCES chat_rooms (id),
    CONSTRAINT fk_chat_message_reads_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_chat_message_reads_last_message FOREIGN KEY (last_read_message_id) REFERENCES chat_messages (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_share_links (
    id BIGINT NOT NULL AUTO_INCREMENT,
    trip_id BIGINT NOT NULL,
    share_token VARCHAR(255) NOT NULL,
    permission VARCHAR(20) NOT NULL,
    expires_at DATETIME NULL,
    is_active BOOLEAN NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_share_links_share_token UNIQUE (share_token),
    INDEX idx_trip_share_links_trip_id (trip_id),
    INDEX idx_trip_share_links_created_by (created_by),
    CONSTRAINT fk_trip_share_links_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_share_links_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_copies (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_trip_id BIGINT NOT NULL,
    copied_trip_id BIGINT NOT NULL,
    copied_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_trip_copies_source_trip_id (source_trip_id),
    INDEX idx_trip_copies_copied_trip_id (copied_trip_id),
    INDEX idx_trip_copies_copied_by (copied_by),
    CONSTRAINT fk_trip_copies_source_trip FOREIGN KEY (source_trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_copies_copied_trip FOREIGN KEY (copied_trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_copies_member FOREIGN KEY (copied_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plan_card_share_links (
    id BIGINT NOT NULL AUTO_INCREMENT,
    plan_card_id BIGINT NOT NULL,
    share_token VARCHAR(255) NOT NULL,
    expires_at DATETIME NULL,
    is_active BOOLEAN NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_plan_card_share_links_token UNIQUE (share_token),
    INDEX idx_plan_card_share_links_card_id (plan_card_id),
    INDEX idx_plan_card_share_links_created_by (created_by),
    CONSTRAINT fk_plan_card_share_links_card FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id),
    CONSTRAINT fk_plan_card_share_links_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE card_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    plan_card_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_card_comments_plan_card_id (plan_card_id),
    INDEX idx_card_comments_member_id (member_id),
    CONSTRAINT fk_card_comments_plan_card FOREIGN KEY (plan_card_id) REFERENCES plan_cards (id),
    CONSTRAINT fk_card_comments_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE voice_rooms (
    id BIGINT NOT NULL AUTO_INCREMENT,
    chat_room_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    title VARCHAR(100) NULL,
    status VARCHAR(20) NOT NULL,
    max_participants INT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_voice_rooms_chat_room_id (chat_room_id),
    INDEX idx_voice_rooms_created_by (created_by),
    CONSTRAINT fk_voice_rooms_chat_room FOREIGN KEY (chat_room_id) REFERENCES chat_rooms (id),
    CONSTRAINT fk_voice_rooms_creator FOREIGN KEY (created_by) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE voice_room_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    voice_room_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    participant_role VARCHAR(20) NOT NULL,
    joined_at DATETIME NOT NULL,
    left_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_voice_room_participants_room_member UNIQUE (voice_room_id, member_id),
    INDEX idx_voice_room_participants_member_id (member_id),
    CONSTRAINT fk_voice_room_participants_room FOREIGN KEY (voice_room_id) REFERENCES voice_rooms (id),
    CONSTRAINT fk_voice_room_participants_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
