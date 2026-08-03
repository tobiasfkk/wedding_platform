package com.tobias.wedding.wedding;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface WeddingEventRepository extends JpaRepository<WeddingEvent, UUID> {

    Optional<WeddingEvent> findFirstByOrderByCreatedAtAsc();
}
