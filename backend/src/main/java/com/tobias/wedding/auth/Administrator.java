package com.tobias.wedding.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "administrator", schema = "wedding")
class Administrator {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Administrator() {}

    private Administrator(String email, String passwordHash) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.email = normalizeEmail(email);
        this.passwordHash = passwordHash;
        this.enabled = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    static Administrator create(String email, String passwordHash) {
        return new Administrator(email, passwordHash);
    }

    static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    String email() {
        return email;
    }

    String passwordHash() {
        return passwordHash;
    }

    boolean enabled() {
        return enabled;
    }

    @PreUpdate
    void markUpdated() {
        updatedAt = Instant.now();
    }
}
