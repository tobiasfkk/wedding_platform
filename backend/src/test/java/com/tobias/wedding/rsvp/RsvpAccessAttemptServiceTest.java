package com.tobias.wedding.rsvp;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RsvpAccessAttemptServiceTest {

    @Test
    void blocksOnlyTheOriginThatReachedTheFailureLimit() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-03T12:00:00Z"), ZoneOffset.UTC);
        RsvpAccessAttemptService attempts = new RsvpAccessAttemptService(2, Duration.ofMinutes(15), 100, clock);

        attempts.recordFailure("198.51.100.10");
        assertThat(attempts.isBlocked("198.51.100.10")).isFalse();
        attempts.recordFailure("198.51.100.10");

        assertThat(attempts.isBlocked("198.51.100.10")).isTrue();
        assertThat(attempts.isBlocked("198.51.100.11")).isFalse();
    }

    @Test
    void stopsTrackingNewOriginsWhenTheBoundIsReached() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-03T12:00:00Z"), ZoneOffset.UTC);
        RsvpAccessAttemptService attempts = new RsvpAccessAttemptService(10, Duration.ofMinutes(15), 1, clock);

        attempts.recordFailure("198.51.100.10");

        assertThat(attempts.isBlocked("198.51.100.11")).isTrue();
    }
}
