package com.tobias.wedding.invitation;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface InvitationGuestRepository extends JpaRepository<InvitationGuest, UUID> {

    List<InvitationGuest> findAllByInvitationIdAndUnlinkedAtIsNull(UUID invitationId);

    List<InvitationGuest> findAllByGuestIdInAndUnlinkedAtIsNull(Collection<UUID> guestIds);
}
