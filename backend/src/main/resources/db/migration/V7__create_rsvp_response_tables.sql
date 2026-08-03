CREATE TABLE wedding.rsvp_submission (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES wedding.invitation(id),
    request_hash CHAR(64) NOT NULL,
    origin VARCHAR(30) NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT rsvp_submission_hash_format CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT rsvp_submission_origin_valid CHECK (origin IN ('PUBLIC_LINK'))
);

CREATE TABLE wedding.rsvp_response (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES wedding.invitation(id),
    guest_id UUID NOT NULL REFERENCES wedding.guest(id),
    status VARCHAR(20) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT rsvp_response_status_valid CHECK (status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
    CONSTRAINT rsvp_response_invitation_guest_unique UNIQUE (invitation_id, guest_id)
);

CREATE TABLE wedding.rsvp_change (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES wedding.rsvp_submission(id),
    invitation_id UUID NOT NULL REFERENCES wedding.invitation(id),
    guest_id UUID NOT NULL REFERENCES wedding.guest(id),
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    origin VARCHAR(30) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT rsvp_change_previous_status_valid
        CHECK (previous_status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
    CONSTRAINT rsvp_change_new_status_valid
        CHECK (new_status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
    CONSTRAINT rsvp_change_origin_valid CHECK (origin IN ('PUBLIC_LINK')),
    CONSTRAINT rsvp_change_submission_guest_unique UNIQUE (submission_id, guest_id)
);

CREATE INDEX rsvp_submission_invitation_time_idx
    ON wedding.rsvp_submission (invitation_id, submitted_at DESC);
CREATE INDEX rsvp_response_invitation_status_idx
    ON wedding.rsvp_response (invitation_id, status);
CREATE INDEX rsvp_change_invitation_time_idx
    ON wedding.rsvp_change (invitation_id, occurred_at DESC);

COMMENT ON TABLE wedding.rsvp_submission IS
    'Operacoes idempotentes enviadas pelos responsaveis dos convites';
COMMENT ON TABLE wedding.rsvp_response IS
    'Estado mais recente da resposta de cada participante do convite';
COMMENT ON TABLE wedding.rsvp_change IS
    'Historico imutavel das alteracoes de resposta por participante';
