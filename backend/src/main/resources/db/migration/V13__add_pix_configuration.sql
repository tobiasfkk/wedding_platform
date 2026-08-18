ALTER TABLE wedding.wedding_event
    ADD COLUMN pix_key VARCHAR(140),
    ADD COLUMN pix_payload VARCHAR(2048),
    ADD COLUMN pix_recipient_name VARCHAR(160),
    ADD CONSTRAINT wedding_event_pix_configuration_complete CHECK (
        (pix_payload IS NULL AND pix_recipient_name IS NULL)
        OR (
            pix_payload IS NOT NULL
            AND btrim(pix_payload) <> ''
            AND pix_recipient_name IS NOT NULL
            AND btrim(pix_recipient_name) <> ''
        )
    );

COMMENT ON COLUMN wedding.wedding_event.pix_key IS 'Chave Pix pública opcional exibida aos convidados';
COMMENT ON COLUMN wedding.wedding_event.pix_payload IS 'Payload público Pix Copia e Cola no padrão BR Code';
COMMENT ON COLUMN wedding.wedding_event.pix_recipient_name IS 'Nome público do recebedor apresentado aos convidados';
