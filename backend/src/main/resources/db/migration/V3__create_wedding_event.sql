CREATE TABLE wedding.wedding_event (
    id UUID PRIMARY KEY,
    display_name VARCHAR(160) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    rsvp_deadline TIMESTAMPTZ NOT NULL,
    time_zone VARCHAR(64) NOT NULL,
    location VARCHAR(300) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT wedding_event_display_name_not_blank CHECK (btrim(display_name) <> ''),
    CONSTRAINT wedding_event_location_not_blank CHECK (btrim(location) <> ''),
    CONSTRAINT wedding_event_rsvp_deadline_before_start CHECK (rsvp_deadline <= starts_at)
);

COMMENT ON TABLE wedding.wedding_event IS 'Configurações do casamento administrado pela instalação';
