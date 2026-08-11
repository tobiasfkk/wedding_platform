package com.tobias.wedding.wedding;

import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentWedding {

    private final ObjectProvider<WeddingEventRepository> repositories;

    CurrentWedding(ObjectProvider<WeddingEventRepository> repositories) {
        this.repositories = repositories;
    }

    @Transactional
    public UUID requireId() {
        return repositories.getObject().findFirstByOrderByCreatedAtAsc()
                .map(WeddingEvent::id)
                .orElseGet(() -> repositories.getObject()
                        .saveAndFlush(WeddingEvent.installationContext())
                        .id());
    }
}
