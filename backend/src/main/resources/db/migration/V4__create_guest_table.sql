CREATE TABLE wedding.guest (
    id UUID PRIMARY KEY,
    wedding_event_id UUID NOT NULL REFERENCES wedding.wedding_event(id),
    name VARCHAR(160) NOT NULL,
    contact VARCHAR(254),
    active BOOLEAN NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deactivated_at TIMESTAMPTZ,
    CONSTRAINT guest_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT guest_contact_not_blank CHECK (contact IS NULL OR btrim(contact) <> ''),
    CONSTRAINT guest_deactivation_consistent CHECK (
        (active AND deactivated_at IS NULL) OR (NOT active AND deactivated_at IS NOT NULL)
    )
);

CREATE INDEX guest_wedding_name_idx ON wedding.guest (wedding_event_id, lower(name), id);
CREATE INDEX guest_wedding_active_name_idx ON wedding.guest (wedding_event_id, active, lower(name), id);

COMMENT ON TABLE wedding.guest IS 'Pessoas elegíveis para compor convites do casamento';
