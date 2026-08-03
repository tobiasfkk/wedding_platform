package com.tobias.wedding.rsvp;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RsvpResponseRepository extends JpaRepository<RsvpResponse, UUID> {

    List<RsvpResponse> findAllByInvitationId(UUID invitationId);
}
