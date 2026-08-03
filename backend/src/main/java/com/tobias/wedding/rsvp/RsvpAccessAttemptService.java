package com.tobias.wedding.rsvp;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
class RsvpAccessAttemptService {

    private final ConcurrentMap<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final int maximumAttempts;
    private final int maximumTrackedOrigins;
    private final Duration window;
    private final Clock clock;

    @Autowired
    RsvpAccessAttemptService(
            @Value("${wedding.rsvp.access-attempts.maximum:10}") int maximumAttempts,
            @Value("${wedding.rsvp.access-attempts.window:15m}") Duration window,
            @Value("${wedding.rsvp.access-attempts.maximum-tracked-origins:10000}") int maximumTrackedOrigins) {
        this(maximumAttempts, window, maximumTrackedOrigins, Clock.systemUTC());
    }

    RsvpAccessAttemptService(
            int maximumAttempts,
            Duration window,
            int maximumTrackedOrigins,
            Clock clock) {
        this.maximumAttempts = maximumAttempts;
        this.window = window;
        this.maximumTrackedOrigins = maximumTrackedOrigins;
        this.clock = clock;
    }

    boolean isBlocked(String origin) {
        Deque<Instant> attempts = failures.get(origin);
        if (attempts == null) {
            if (failures.size() >= maximumTrackedOrigins) {
                removeExpiredOrigins();
            }
            return failures.size() >= maximumTrackedOrigins;
        }
        synchronized (attempts) {
            removeExpired(attempts);
            if (attempts.isEmpty()) {
                failures.remove(origin, attempts);
                return false;
            }
            return attempts.size() >= maximumAttempts;
        }
    }

    void recordFailure(String origin) {
        if (failures.size() >= maximumTrackedOrigins && !failures.containsKey(origin)) {
            removeExpiredOrigins();
            if (failures.size() >= maximumTrackedOrigins) {
                return;
            }
        }
        Deque<Instant> attempts = failures.computeIfAbsent(origin, ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            removeExpired(attempts);
            attempts.addLast(clock.instant());
        }
    }

    private void removeExpiredOrigins() {
        for (Map.Entry<String, Deque<Instant>> entry : failures.entrySet()) {
            Deque<Instant> attempts = entry.getValue();
            synchronized (attempts) {
                removeExpired(attempts);
                if (attempts.isEmpty()) {
                    failures.remove(entry.getKey(), attempts);
                }
            }
        }
    }

    private void removeExpired(Deque<Instant> attempts) {
        Instant threshold = clock.instant().minus(window);
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(threshold)) {
            attempts.removeFirst();
        }
    }
}
