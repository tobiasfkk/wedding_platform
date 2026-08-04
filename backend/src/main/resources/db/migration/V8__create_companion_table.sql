CREATE TABLE wedding.companion (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES wedding.invitation(id),
    name VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    removed_at TIMESTAMPTZ,
    CONSTRAINT companion_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT companion_status_valid CHECK (status IN ('CONFIRMED')),
    CONSTRAINT companion_removal_consistent CHECK (
        (status = 'CONFIRMED' AND removed_at IS NULL) OR removed_at IS NOT NULL
    )
);

CREATE INDEX companion_invitation_current_idx
    ON wedding.companion (invitation_id, created_at, id)
    WHERE removed_at IS NULL;

COMMENT ON TABLE wedding.companion IS
    'Acompanhantes confirmados e seu historico de inclusao e remocao no convite';
