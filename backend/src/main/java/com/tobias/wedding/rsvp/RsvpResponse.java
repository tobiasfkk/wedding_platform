package com.tobias.wedding.rsvp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "rsvp_response", schema = "wedding")
class RsvpResponse {

    @Id
    private UUID id;

    @Column(name = "invitation_id", nullable = false)
    private UUID invitationId;

    @Column(name = "guest_id", nullable = false)
    private UUID guestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RsvpStatus status;

    @Version
    private long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RsvpResponse() {}

    private RsvpResponse(UUID invitationId, UUID guestId, RsvpStatus status, Instant updatedAt) {
        this.id = UUID.randomUUID();
        this.invitationId = invitationId;
        this.guestId = guestId;
        this.status = status;
        this.updatedAt = updatedAt;
    }

    static RsvpResponse create(UUID invitationId, UUID guestId, RsvpStatus status, Instant updatedAt) {
        return new RsvpResponse(invitationId, guestId, status, updatedAt);
    }

    UUID guestId() {
        return guestId;
    }

    RsvpStatus status() {
        return status;
    }

    void changeTo(RsvpStatus newStatus, Instant changedAt) {
        status = newStatus;
        updatedAt = changedAt;
    }
}
