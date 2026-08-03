package com.tobias.wedding.invitation;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    Page<Invitation> findByWeddingEventIdAndNameContainingIgnoreCase(
            UUID weddingEventId, String name, Pageable pageable);

    Page<Invitation> findByWeddingEventIdAndNameContainingIgnoreCaseAndStatus(
            UUID weddingEventId, String name, InvitationStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Invitation> findByIdAndWeddingEventId(UUID id, UUID weddingEventId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invitation from Invitation invitation where invitation.id = :id")
    Optional<Invitation> findByIdForRsvp(@Param("id") UUID id);
}
