CREATE TABLE wedding.invitation (
    id UUID PRIMARY KEY,
    wedding_event_id UUID NOT NULL REFERENCES wedding.wedding_event(id),
    name VARCHAR(160) NOT NULL,
    companion_limit INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT invitation_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT invitation_companion_limit_non_negative CHECK (companion_limit >= 0),
    CONSTRAINT invitation_status_valid CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);

CREATE TABLE wedding.invitation_guest (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES wedding.invitation(id),
    guest_id UUID NOT NULL REFERENCES wedding.guest(id),
    linked_at TIMESTAMPTZ NOT NULL,
    unlinked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX invitation_guest_current_unique_idx
    ON wedding.invitation_guest (guest_id)
    WHERE unlinked_at IS NULL;
CREATE INDEX invitation_wedding_name_idx ON wedding.invitation (wedding_event_id, lower(name), id);
CREATE INDEX invitation_guest_invitation_current_idx
    ON wedding.invitation_guest (invitation_id, guest_id)
    WHERE unlinked_at IS NULL;

COMMENT ON TABLE wedding.invitation IS 'Grupos que receberão acesso individual ao RSVP';
COMMENT ON TABLE wedding.invitation_guest IS 'Histórico de vínculos entre convites e convidados';
