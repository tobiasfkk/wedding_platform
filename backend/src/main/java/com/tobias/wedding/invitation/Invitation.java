package com.tobias.wedding.invitation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitation", schema = "wedding")
class Invitation {

    @Id
    private UUID id;

    @Column(name = "wedding_event_id", nullable = false)
    private UUID weddingEventId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(name = "companion_limit", nullable = false)
    private int companionLimit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Invitation() {}

    private Invitation(UUID weddingEventId, String name, int companionLimit) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.weddingEventId = weddingEventId;
        this.status = InvitationStatus.DRAFT;
        this.createdAt = now;
        this.updatedAt = now;
        update(name, companionLimit);
    }

    static Invitation create(UUID weddingEventId, String name, int companionLimit) {
        return new Invitation(weddingEventId, name, companionLimit);
    }

    void update(String name, int companionLimit) {
        this.name = name.strip();
        this.companionLimit = companionLimit;
    }

    void activate() {
        status = InvitationStatus.ACTIVE;
    }

    void inactivate() {
        status = InvitationStatus.INACTIVE;
    }

    UUID id() {
        return id;
    }

    UUID weddingEventId() {
        return weddingEventId;
    }

    String name() {
        return name;
    }

    int companionLimit() {
        return companionLimit;
    }

    InvitationStatus status() {
        return status;
    }

    long version() {
        return version;
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }
}
