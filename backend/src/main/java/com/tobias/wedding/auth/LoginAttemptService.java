package com.tobias.wedding.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
class LoginAttemptService {

    private final ConcurrentMap<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final int maximumAttempts;
    private final Duration window;
    private final Clock clock;

    @Autowired
    LoginAttemptService(
            @Value("${wedding.auth.login-attempts.maximum:5}") int maximumAttempts,
            @Value("${wedding.auth.login-attempts.window:15m}") Duration window) {
        this(maximumAttempts, window, Clock.systemUTC());
    }

    LoginAttemptService(int maximumAttempts, Duration window, Clock clock) {
        this.maximumAttempts = maximumAttempts;
        this.window = window;
        this.clock = clock;
    }

    boolean isBlocked(String email, String origin) {
        String key = key(email, origin);
        Deque<Instant> attempts = failures.get(key);
        if (attempts == null) {
            return false;
        }
        synchronized (attempts) {
            removeExpired(attempts);
            if (attempts.isEmpty()) {
                failures.remove(key, attempts);
                return false;
            }
            return attempts.size() >= maximumAttempts;
        }
    }

    void recordFailure(String email, String origin) {
        Deque<Instant> attempts = failures.computeIfAbsent(key(email, origin), ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            removeExpired(attempts);
            attempts.addLast(clock.instant());
        }
    }

    void clear(String email, String origin) {
        failures.remove(key(email, origin));
    }

    private void removeExpired(Deque<Instant> attempts) {
        Instant threshold = clock.instant().minus(window);
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(threshold)) {
            attempts.removeFirst();
        }
    }

    private String key(String email, String origin) {
        return email.strip().toLowerCase(Locale.ROOT) + '|' + origin;
    }
}
