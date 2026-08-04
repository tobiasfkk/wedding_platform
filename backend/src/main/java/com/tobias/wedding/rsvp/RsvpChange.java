package com.tobias.wedding.rsvp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "rsvp_change", schema = "wedding")
class RsvpChange {

    @Id
    private UUID id;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "invitation_id", nullable = false)
    private UUID invitationId;

    @Column(name = "guest_id", nullable = false)
    private UUID guestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, length = 20)
    private RsvpStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 20)
    private RsvpStatus newStatus;

    @Column(nullable = false, length = 30)
    private String origin;

    @Column(name = "changed_by", length = 254)
    private String changedBy;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected RsvpChange() {}

    private RsvpChange(
            UUID submissionId,
            UUID invitationId,
            UUID guestId,
            RsvpStatus previousStatus,
            RsvpStatus newStatus,
            String origin,
            String changedBy,
            Instant occurredAt) {
        this.id = UUID.randomUUID();
        this.submissionId = submissionId;
        this.invitationId = invitationId;
        this.guestId = guestId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.origin = origin;
        this.changedBy = changedBy;
        this.occurredAt = occurredAt;
    }

    static RsvpChange create(
            UUID submissionId,
            UUID invitationId,
            UUID guestId,
            RsvpStatus previousStatus,
            RsvpStatus newStatus,
            String origin,
            String changedBy,
            Instant occurredAt) {
        return new RsvpChange(
                submissionId,
                invitationId,
                guestId,
                previousStatus,
                newStatus,
                origin,
                changedBy,
                occurredAt);
    }
}
