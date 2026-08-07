package com.tobias.wedding.site;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wedding_site", schema = "wedding")
class WeddingSite {

    @Id
    private UUID id;

    @Column(name = "wedding_event_id", nullable = false, unique = true)
    private UUID weddingEventId;

    @Column(name = "draft_content", nullable = false, columnDefinition = "TEXT")
    private String draftContent;

    @Column(name = "draft_version", nullable = false)
    private long draftVersion;

    @Column(name = "published_content", columnDefinition = "TEXT")
    private String publishedContent;

    @Column(name = "published_version")
    private Long publishedVersion;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    @Column(name = "entity_version", nullable = false)
    private long entityVersion;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WeddingSite() {}

    private WeddingSite(UUID weddingEventId, String draftContent) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.weddingEventId = weddingEventId;
        this.draftContent = draftContent;
        this.draftVersion = 1;
        this.createdAt = now;
        this.updatedAt = now;
    }

    static WeddingSite create(UUID weddingEventId, String draftContent) {
        return new WeddingSite(weddingEventId, draftContent);
    }

    void updateDraft(String content) {
        draftContent = content;
        draftVersion++;
    }

    void publish() {
        publishedContent = draftContent;
        publishedVersion = draftVersion;
        publishedAt = Instant.now();
    }

    void unpublish() {
        publishedContent = null;
        publishedVersion = null;
        publishedAt = null;
    }

    UUID weddingEventId() {
        return weddingEventId;
    }

    String draftContent() {
        return draftContent;
    }

    long draftVersion() {
        return draftVersion;
    }

    String publishedContent() {
        return publishedContent;
    }

    Long publishedVersion() {
        return publishedVersion;
    }

    Instant publishedAt() {
        return publishedAt;
    }

    boolean published() {
        return publishedContent != null;
    }

    boolean hasUnpublishedChanges() {
        return publishedVersion == null || draftVersion != publishedVersion;
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }
}
