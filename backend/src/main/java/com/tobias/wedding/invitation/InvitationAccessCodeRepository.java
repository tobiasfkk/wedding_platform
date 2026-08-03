package com.tobias.wedding.invitation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface InvitationAccessCodeRepository extends JpaRepository<InvitationAccessCode, UUID> {

    List<InvitationAccessCode> findAllByInvitationIdAndRevokedAtIsNull(UUID invitationId);

    Optional<InvitationAccessCode> findByTokenDigestAndPepperVersionAndRevokedAtIsNull(
            String tokenDigest, int pepperVersion);

    boolean existsByTokenDigest(String tokenDigest);
}
