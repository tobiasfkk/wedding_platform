package com.tobias.wedding.invitation;

import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvitationCodeVerifier {

    private final ObjectProvider<InvitationAccessCodeRepository> accessCodeRepositories;
    private final ObjectProvider<InvitationRepository> invitationRepositories;
    private final InvitationCodeCodec codec;

    InvitationCodeVerifier(
            ObjectProvider<InvitationAccessCodeRepository> accessCodeRepositories,
            ObjectProvider<InvitationRepository> invitationRepositories,
            InvitationCodeCodec codec) {
        this.accessCodeRepositories = accessCodeRepositories;
        this.invitationRepositories = invitationRepositories;
        this.codec = codec;
    }

    @Transactional(readOnly = true)
    public Optional<UUID> findActiveInvitation(String token) {
        for (InvitationCodeCodec.CodeDigest digest : codec.verificationDigests(token)) {
            Optional<InvitationAccessCode> accessCode = accessCodeRepository()
                    .findByTokenDigestAndPepperVersionAndRevokedAtIsNull(
                            digest.digest(), digest.pepperVersion());
            if (accessCode.isPresent()) {
                return invitationRepository()
                        .findById(accessCode.get().invitationId())
                        .filter(invitation -> invitation.status() == InvitationStatus.ACTIVE)
                        .map(Invitation::id);
            }
        }
        return Optional.empty();
    }

    private InvitationAccessCodeRepository accessCodeRepository() {
        return accessCodeRepositories.getObject();
    }

    private InvitationRepository invitationRepository() {
        return invitationRepositories.getObject();
    }
}
