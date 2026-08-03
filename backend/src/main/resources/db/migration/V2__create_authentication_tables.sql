CREATE TABLE wedding.administrator (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_administrator_email UNIQUE (email),
    CONSTRAINT ck_administrator_email_normalized CHECK (email = LOWER(email))
);

CREATE TABLE wedding.spring_session (
    primary_id CHAR(36) NOT NULL,
    session_id CHAR(36) NOT NULL,
    creation_time BIGINT NOT NULL,
    last_access_time BIGINT NOT NULL,
    max_inactive_interval INTEGER NOT NULL,
    expiry_time BIGINT NOT NULL,
    principal_name VARCHAR(254),
    CONSTRAINT pk_spring_session PRIMARY KEY (primary_id)
);

CREATE UNIQUE INDEX spring_session_ix1 ON wedding.spring_session (session_id);
CREATE INDEX spring_session_ix2 ON wedding.spring_session (expiry_time);
CREATE INDEX spring_session_ix3 ON wedding.spring_session (principal_name);

CREATE TABLE wedding.spring_session_attributes (
    session_primary_id CHAR(36) NOT NULL,
    attribute_name VARCHAR(200) NOT NULL,
    attribute_bytes BYTEA NOT NULL,
    CONSTRAINT pk_spring_session_attributes PRIMARY KEY (session_primary_id, attribute_name),
    CONSTRAINT fk_spring_session_attributes FOREIGN KEY (session_primary_id)
        REFERENCES wedding.spring_session (primary_id) ON DELETE CASCADE
);

COMMENT ON TABLE wedding.administrator IS 'Administrative accounts with adaptively hashed passwords';
COMMENT ON COLUMN wedding.administrator.password_hash IS 'Versioned Argon2id encoded password hash';
