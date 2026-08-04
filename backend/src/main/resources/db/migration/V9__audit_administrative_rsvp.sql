ALTER TABLE wedding.rsvp_submission
    ADD COLUMN submitted_by VARCHAR(254),
    DROP CONSTRAINT rsvp_submission_origin_valid,
    ADD CONSTRAINT rsvp_submission_origin_valid CHECK (origin IN ('PUBLIC_LINK', 'ADMIN')),
    ADD CONSTRAINT rsvp_submission_actor_consistent CHECK (
        (origin = 'PUBLIC_LINK' AND submitted_by IS NULL)
        OR (origin = 'ADMIN' AND submitted_by IS NOT NULL AND btrim(submitted_by) <> '')
    );

ALTER TABLE wedding.rsvp_change
    ADD COLUMN changed_by VARCHAR(254),
    DROP CONSTRAINT rsvp_change_origin_valid,
    ADD CONSTRAINT rsvp_change_origin_valid CHECK (origin IN ('PUBLIC_LINK', 'ADMIN')),
    ADD CONSTRAINT rsvp_change_actor_consistent CHECK (
        (origin = 'PUBLIC_LINK' AND changed_by IS NULL)
        OR (origin = 'ADMIN' AND changed_by IS NOT NULL AND btrim(changed_by) <> '')
    );

COMMENT ON COLUMN wedding.rsvp_submission.submitted_by IS
    'Identificador do administrador quando a origem da submissao for administrativa';
COMMENT ON COLUMN wedding.rsvp_change.changed_by IS
    'Identificador do administrador responsavel pela alteracao';
