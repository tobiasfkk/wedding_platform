package com.tobias.wedding.guest;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guest", schema = "wedding")
class Guest {

    @Id
    private UUID id;

    @Column(name = "wedding_event_id", nullable = false)
    private UUID weddingEventId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 254)
    private String contact;

    @Column(nullable = false)
    private boolean active;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deactivated_at")
    private Instant deactivatedAt;

    protected Guest() {}

    private Guest(UUID weddingEventId, String name, String contact, boolean active) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.weddingEventId = weddingEventId;
        this.createdAt = now;
        this.updatedAt = now;
        update(name, contact);
        changeStatus(active);
    }

    static Guest create(UUID weddingEventId, String name, String contact, boolean active) {
        return new Guest(weddingEventId, name, contact, active);
    }

    void update(String name, String contact) {
        this.name = name.strip();
        this.contact = normalizeOptional(contact);
    }

    void changeStatus(boolean active) {
        if (!active && (this.active || deactivatedAt == null)) {
            deactivatedAt = Instant.now();
        } else if (active) {
            deactivatedAt = null;
        }
        this.active = active;
    }

    UUID id() {
        return id;
    }

    String name() {
        return name;
    }

    String contact() {
        return contact;
    }

    boolean active() {
        return active;
    }

    long version() {
        return version;
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
