CREATE TABLE wedding.invitation_access_code (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES wedding.invitation(id),
    token_digest CHAR(64) NOT NULL,
    pepper_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(254) NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(254),
    CONSTRAINT invitation_access_code_pepper_version_positive CHECK (pepper_version > 0),
    CONSTRAINT invitation_access_code_digest_format CHECK (token_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT invitation_access_code_revocation_complete CHECK (
        (revoked_at IS NULL AND revoked_by IS NULL)
        OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    ),
    CONSTRAINT invitation_access_code_digest_unique UNIQUE (token_digest)
);

CREATE UNIQUE INDEX invitation_access_code_current_unique_idx
    ON wedding.invitation_access_code (invitation_id)
    WHERE revoked_at IS NULL;
CREATE INDEX invitation_access_code_invitation_history_idx
    ON wedding.invitation_access_code (invitation_id, created_at DESC);

COMMENT ON TABLE wedding.invitation_access_code IS
    'Resumos HMAC dos códigos de convite e histórico de rotação; tokens originais nunca são persistidos';
