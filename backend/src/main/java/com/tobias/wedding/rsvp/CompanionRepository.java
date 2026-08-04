package com.tobias.wedding.rsvp;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface CompanionRepository extends JpaRepository<Companion, UUID> {

    List<Companion> findAllByInvitationIdOrderByCreatedAtAscIdAsc(UUID invitationId);

    List<Companion> findAllByIdIn(Collection<UUID> ids);
}
