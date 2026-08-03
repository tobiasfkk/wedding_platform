package com.tobias.wedding.guest;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface GuestRepository extends JpaRepository<Guest, UUID> {

    Page<Guest> findByWeddingEventIdAndNameContainingIgnoreCase(
            UUID weddingEventId, String name, Pageable pageable);

    Page<Guest> findByWeddingEventIdAndNameContainingIgnoreCaseAndActive(
            UUID weddingEventId, String name, boolean active, Pageable pageable);

    boolean existsByIdAndWeddingEventId(UUID id, UUID weddingEventId);
}
