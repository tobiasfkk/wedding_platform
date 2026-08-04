package com.tobias.wedding.rsvp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "rsvp_submission", schema = "wedding")
class RsvpSubmission {

    @Id
    private UUID id;

    @Column(name = "invitation_id", nullable = false)
    private UUID invitationId;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(nullable = false, length = 30)
    private String origin;

    @Column(name = "submitted_by", length = 254)
    private String submittedBy;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    protected RsvpSubmission() {}

    private RsvpSubmission(
            UUID id,
            UUID invitationId,
            String requestHash,
            String origin,
            String submittedBy,
            Instant submittedAt) {
        this.id = id;
        this.invitationId = invitationId;
        this.requestHash = requestHash;
        this.origin = origin;
        this.submittedBy = submittedBy;
        this.submittedAt = submittedAt;
    }

    static RsvpSubmission create(
            UUID id,
            UUID invitationId,
            String requestHash,
            String origin,
            String submittedBy,
            Instant submittedAt) {
        return new RsvpSubmission(id, invitationId, requestHash, origin, submittedBy, submittedAt);
    }

    boolean matches(
            UUID expectedInvitationId,
            String expectedRequestHash,
            String expectedOrigin,
            String expectedSubmittedBy) {
        return invitationId.equals(expectedInvitationId)
                && requestHash.equals(expectedRequestHash)
                && origin.equals(expectedOrigin)
                && java.util.Objects.equals(submittedBy, expectedSubmittedBy);
    }

    Instant submittedAt() {
        return submittedAt;
    }
}
