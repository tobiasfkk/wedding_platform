package com.tobias.wedding.invitation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitation_access_code", schema = "wedding")
class InvitationAccessCode {

    @Id
    private UUID id;

    @Column(name = "invitation_id", nullable = false)
    private UUID invitationId;

    @Column(name = "token_digest", nullable = false, length = 64)
    private String tokenDigest;

    @Column(name = "pepper_version", nullable = false)
    private int pepperVersion;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 254)
    private String createdBy;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by", length = 254)
    private String revokedBy;

    protected InvitationAccessCode() {}

    private InvitationAccessCode(
            UUID invitationId,
            String tokenDigest,
            int pepperVersion,
            String createdBy) {
        this.id = UUID.randomUUID();
        this.invitationId = invitationId;
        this.tokenDigest = tokenDigest;
        this.pepperVersion = pepperVersion;
        this.createdAt = Instant.now();
        this.createdBy = createdBy;
    }

    static InvitationAccessCode create(
            UUID invitationId,
            InvitationCodeCodec.GeneratedCode generated,
            String actor) {
        return new InvitationAccessCode(invitationId, generated.digest(), generated.pepperVersion(), actor);
    }

    void revoke(String actor) {
        if (revokedAt == null) {
            revokedAt = Instant.now();
            revokedBy = actor;
        }
    }

    UUID invitationId() {
        return invitationId;
    }
}
