ALTER TABLE expense_participants
    ADD COLUMN settlement_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN settled_at DATETIME NULL;

UPDATE expense_participants ep
    JOIN expenses e ON e.id = ep.expense_id
    SET ep.settlement_status = 'COMPLETED', ep.settled_at = ep.created_at
    WHERE ep.member_id = e.payer_id;
