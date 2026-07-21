ALTER TABLE members
    DROP INDEX uk_members_email,
    DROP INDEX uk_members_provider_id,
    ADD CONSTRAINT uk_members_provider_provider_id UNIQUE (provider, provider_id);
