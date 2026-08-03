package com.tobias.wedding.wedding;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

@Entity
@Table(name = "wedding_event", schema = "wedding")
class WeddingEvent {

    @Id
    private UUID id;

    @Column(name = "display_name", nullable = false, length = 160)
    private String displayName;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "rsvp_deadline", nullable = false)
    private Instant rsvpDeadline;

    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone;

    @Column(nullable = false, length = 300)
    private String location;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WeddingEvent() {}

    private WeddingEvent(
            String displayName,
            Instant startsAt,
            Instant rsvpDeadline,
            ZoneId timeZone,
            String location) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.createdAt = now;
        this.updatedAt = now;
        update(displayName, startsAt, rsvpDeadline, timeZone, location);
    }

    static WeddingEvent create(
            String displayName,
            Instant startsAt,
            Instant rsvpDeadline,
            ZoneId timeZone,
            String location) {
        return new WeddingEvent(displayName, startsAt, rsvpDeadline, timeZone, location);
    }

    void update(
            String displayName,
            Instant startsAt,
            Instant rsvpDeadline,
            ZoneId timeZone,
            String location) {
        this.displayName = displayName.strip();
        this.startsAt = startsAt;
        this.rsvpDeadline = rsvpDeadline;
        this.timeZone = timeZone.getId();
        this.location = location.strip();
    }

    String displayName() {
        return displayName;
    }

    Instant startsAt() {
        return startsAt;
    }

    Instant rsvpDeadline() {
        return rsvpDeadline;
    }

    ZoneId timeZone() {
        return ZoneId.of(timeZone);
    }

    String location() {
        return location;
    }

    long version() {
        return version;
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }
}
