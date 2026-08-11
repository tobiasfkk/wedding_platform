DROP TABLE wedding.site_media;
DROP TABLE wedding.wedding_site;

ALTER TABLE wedding.wedding_event
    DROP CONSTRAINT wedding_event_rsvp_deadline_before_start,
    DROP CONSTRAINT wedding_event_display_name_not_blank,
    DROP CONSTRAINT wedding_event_location_not_blank,
    DROP COLUMN display_name,
    DROP COLUMN starts_at,
    DROP COLUMN location,
    ALTER COLUMN rsvp_deadline DROP NOT NULL,
    ALTER COLUMN time_zone SET DEFAULT 'America/Sao_Paulo',
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

COMMENT ON TABLE wedding.wedding_event IS 'Contexto técnico da instalação e prazo operacional do RSVP';
