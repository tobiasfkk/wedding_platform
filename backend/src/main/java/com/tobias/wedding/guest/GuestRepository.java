package com.tobias.wedding.guest;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

interface GuestRepository extends JpaRepository<Guest, UUID> {

    Page<Guest> findByWeddingEventIdAndNameContainingIgnoreCase(
            UUID weddingEventId, String name, Pageable pageable);

    Page<Guest> findByWeddingEventIdAndNameContainingIgnoreCaseAndActive(
            UUID weddingEventId, String name, boolean active, Pageable pageable);

    boolean existsByIdAndWeddingEventId(UUID id, UUID weddingEventId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Guest> findAllByIdInAndWeddingEventIdAndActiveTrue(Collection<UUID> ids, UUID weddingEventId);

    List<Guest> findAllByIdInAndWeddingEventId(Collection<UUID> ids, UUID weddingEventId);
}
