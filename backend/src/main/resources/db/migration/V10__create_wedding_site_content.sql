CREATE TABLE wedding.wedding_site (
    id UUID PRIMARY KEY,
    wedding_event_id UUID NOT NULL UNIQUE REFERENCES wedding.wedding_event(id) ON DELETE CASCADE,
    draft_content TEXT NOT NULL,
    draft_version BIGINT NOT NULL,
    published_content TEXT,
    published_version BIGINT,
    published_at TIMESTAMPTZ,
    entity_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT wedding_site_draft_version_positive CHECK (draft_version > 0),
    CONSTRAINT wedding_site_publication_consistent CHECK (
        (published_content IS NULL AND published_version IS NULL AND published_at IS NULL)
        OR
        (published_content IS NOT NULL AND published_version IS NOT NULL AND published_at IS NOT NULL)
    )
);

CREATE TABLE wedding.site_media (
    id UUID PRIMARY KEY,
    wedding_event_id UUID NOT NULL REFERENCES wedding.wedding_event(id) ON DELETE CASCADE,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    content_type VARCHAR(80) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT site_media_dimensions_positive CHECK (width > 0 AND height > 0),
    CONSTRAINT site_media_size_positive CHECK (size_bytes > 0)
);

CREATE INDEX site_media_wedding_event_idx ON wedding.site_media(wedding_event_id);

COMMENT ON TABLE wedding.wedding_site IS 'Rascunho e versão publicada do site do casamento';
COMMENT ON TABLE wedding.site_media IS 'Metadados de imagens do site armazenadas por provedor externo ao domínio';
