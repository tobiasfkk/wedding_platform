package com.tobias.wedding.rsvp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "companion", schema = "wedding")
class Companion {

    @Id
    private UUID id;

    @Column(name = "invitation_id", nullable = false)
    private UUID invitationId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 20)
    private String status;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "removed_at")
    private Instant removedAt;

    protected Companion() {}

    private Companion(UUID id, UUID invitationId, String name, Instant createdAt) {
        this.id = id;
        this.invitationId = invitationId;
        this.status = RsvpStatus.CONFIRMED.name();
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
        update(name);
    }

    static Companion create(UUID id, UUID invitationId, String name, Instant createdAt) {
        return new Companion(id, invitationId, name, createdAt);
    }

    UUID id() {
        return id;
    }

    UUID invitationId() {
        return invitationId;
    }

    String name() {
        return name;
    }

    boolean active() {
        return removedAt == null;
    }

    void update(String newName) {
        name = newName.strip();
        status = RsvpStatus.CONFIRMED.name();
        removedAt = null;
    }

    void remove(Instant removedAt) {
        if (this.removedAt == null) {
            this.removedAt = removedAt;
        }
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }
}
