package com.tobias.wedding.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

    private static final String EMAIL = "admin@example.com";
    private static final String ORIGIN = "127.0.0.1";

    @Test
    void blocksTheSameAccountAndOriginAfterTheConfiguredNumberOfFailures() {
        LoginAttemptService attempts = new LoginAttemptService(
                2, Duration.ofMinutes(15), Clock.fixed(Instant.parse("2026-08-03T12:00:00Z"), ZoneOffset.UTC));

        attempts.recordFailure(EMAIL, ORIGIN);
        assertThat(attempts.isBlocked(EMAIL, ORIGIN)).isFalse();

        attempts.recordFailure(EMAIL, ORIGIN);
        assertThat(attempts.isBlocked(EMAIL, ORIGIN)).isTrue();

        attempts.clear(EMAIL, ORIGIN);
        assertThat(attempts.isBlocked(EMAIL, ORIGIN)).isFalse();
    }

    @Test
    void keepsOriginsIndependent() {
        LoginAttemptService attempts = new LoginAttemptService(
                1, Duration.ofMinutes(15), Clock.fixed(Instant.parse("2026-08-03T12:00:00Z"), ZoneOffset.UTC));

        attempts.recordFailure(EMAIL, ORIGIN);

        assertThat(attempts.isBlocked(EMAIL, ORIGIN)).isTrue();
        assertThat(attempts.isBlocked(EMAIL, "127.0.0.2")).isFalse();
    }
}
