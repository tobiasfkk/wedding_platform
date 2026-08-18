package com.tobias.wedding.wedding;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PreUpdate;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

@Entity
@Table(name = "wedding_event", schema = "wedding")
class WeddingEvent {

    static final UUID INSTALLATION_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Id
    private UUID id;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "rsvp_deadline")
    private Instant rsvpDeadline;

    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone;

    @Column(name = "pix_key", length = 140)
    private String pixKey;

    @Column(name = "pix_payload", length = 2048)
    private String pixPayload;

    @Column(name = "pix_recipient_name", length = 160)
    private String pixRecipientName;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WeddingEvent() {}

    private WeddingEvent(UUID id) {
        Instant now = Instant.now();
        this.id = id;
        this.createdAt = now;
        this.updatedAt = now;
        this.timeZone = RsvpDeadlineService.DEFAULT_TIME_ZONE.getId();
    }

    static WeddingEvent installationContext() {
        return new WeddingEvent(INSTALLATION_ID);
    }

    UUID id() {
        return id;
    }

    Instant rsvpDeadline() {
        return rsvpDeadline;
    }

    ZoneId timeZone() {
        return ZoneId.of(timeZone);
    }

    String pixKey() {
        return pixKey;
    }

    String pixPayload() {
        return pixPayload;
    }

    String pixRecipientName() {
        return pixRecipientName;
    }

    void updateRsvpDeadline(Instant deadline, ZoneId zoneId) {
        this.rsvpDeadline = deadline;
        this.timeZone = zoneId.getId();
    }

    void updatePixConfiguration(String key, String payload, String recipientName) {
        this.pixKey = key;
        this.pixPayload = payload;
        this.pixRecipientName = recipientName;
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }
}
