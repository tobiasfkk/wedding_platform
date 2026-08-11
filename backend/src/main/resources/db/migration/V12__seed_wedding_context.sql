INSERT INTO wedding.wedding_event (id, time_zone, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'America/Sao_Paulo',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM wedding.wedding_event);
