package com.tobias.wedding.wedding;

import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class WeddingSchedule {

    private final ObjectProvider<WeddingEventRepository> repositories;

    WeddingSchedule(ObjectProvider<WeddingEventRepository> repositories) {
        this.repositories = repositories;
    }

    public Instant rsvpDeadline(UUID weddingId) {
        return repositories.getObject()
                .findById(weddingId)
                .map(WeddingEvent::rsvpDeadline)
                .orElseThrow(() -> new IllegalStateException("Wedding event not found for invitation"));
    }
}
