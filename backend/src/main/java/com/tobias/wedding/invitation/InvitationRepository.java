package com.tobias.wedding.invitation;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    Page<Invitation> findByWeddingEventIdAndNameContainingIgnoreCase(
            UUID weddingEventId, String name, Pageable pageable);

    Page<Invitation> findByWeddingEventIdAndNameContainingIgnoreCaseAndStatus(
            UUID weddingEventId, String name, InvitationStatus status, Pageable pageable);

    Optional<Invitation> findByIdAndWeddingEventId(UUID id, UUID weddingEventId);
}
