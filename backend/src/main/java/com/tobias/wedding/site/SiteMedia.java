package com.tobias.wedding.site;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "site_media", schema = "wedding")
class SiteMedia {

    @Id
    private UUID id;

    @Column(name = "wedding_event_id", nullable = false)
    private UUID weddingEventId;

    @Column(name = "storage_key", nullable = false, unique = true, length = 500)
    private String storageKey;

    @Column(name = "content_type", nullable = false, length = 80)
    private String contentType;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private boolean published;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected SiteMedia() {}

    private SiteMedia(
            UUID id,
            UUID weddingEventId,
            String storageKey,
            String contentType,
            int width,
            int height,
            long sizeBytes) {
        this.id = id;
        this.weddingEventId = weddingEventId;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.width = width;
        this.height = height;
        this.sizeBytes = sizeBytes;
        this.createdAt = Instant.now();
    }

    static SiteMedia create(
            UUID id,
            UUID weddingEventId,
            String storageKey,
            String contentType,
            int width,
            int height,
            long sizeBytes) {
        return new SiteMedia(id, weddingEventId, storageKey, contentType, width, height, sizeBytes);
    }

    UUID id() {
        return id;
    }

    UUID weddingEventId() {
        return weddingEventId;
    }

    String storageKey() {
        return storageKey;
    }

    String contentType() {
        return contentType;
    }

    int width() {
        return width;
    }

    int height() {
        return height;
    }

    long sizeBytes() {
        return sizeBytes;
    }

    void setPublished(boolean value) {
        published = value;
    }
}
