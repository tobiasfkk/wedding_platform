package com.tobias.wedding.invitation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitation_guest", schema = "wedding")
class InvitationGuest {

    @Id
    private UUID id;

    @Column(name = "invitation_id", nullable = false)
    private UUID invitationId;

    @Column(name = "guest_id", nullable = false)
    private UUID guestId;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;

    @Column(name = "unlinked_at")
    private Instant unlinkedAt;

    protected InvitationGuest() {}

    private InvitationGuest(UUID invitationId, UUID guestId) {
        this.id = UUID.randomUUID();
        this.invitationId = invitationId;
        this.guestId = guestId;
        this.linkedAt = Instant.now();
    }

    static InvitationGuest link(UUID invitationId, UUID guestId) {
        return new InvitationGuest(invitationId, guestId);
    }

    void unlink() {
        if (unlinkedAt == null) {
            unlinkedAt = Instant.now();
        }
    }

    UUID invitationId() {
        return invitationId;
    }

    UUID guestId() {
        return guestId;
    }
}
