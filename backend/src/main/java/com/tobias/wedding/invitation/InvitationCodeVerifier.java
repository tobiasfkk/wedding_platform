package com.tobias.wedding.invitation;

import com.tobias.wedding.guest.GuestDirectory;
import com.tobias.wedding.guest.GuestSummary;
import com.tobias.wedding.wedding.WeddingSchedule;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvitationCodeVerifier {

    private final ObjectProvider<InvitationAccessCodeRepository> accessCodeRepositories;
    private final ObjectProvider<InvitationRepository> invitationRepositories;
    private final ObjectProvider<InvitationGuestRepository> membershipRepositories;
    private final InvitationCodeCodec codec;
    private final GuestDirectory guests;
    private final WeddingSchedule schedule;

    InvitationCodeVerifier(
            ObjectProvider<InvitationAccessCodeRepository> accessCodeRepositories,
            ObjectProvider<InvitationRepository> invitationRepositories,
            ObjectProvider<InvitationGuestRepository> membershipRepositories,
            InvitationCodeCodec codec,
            GuestDirectory guests,
            WeddingSchedule schedule) {
        this.accessCodeRepositories = accessCodeRepositories;
        this.invitationRepositories = invitationRepositories;
        this.membershipRepositories = membershipRepositories;
        this.codec = codec;
        this.guests = guests;
        this.schedule = schedule;
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

    private Optional<InvitationAccessView> findActiveAccess(UUID invitationId) {
        return invitationRepository()
                .findById(invitationId)
                .filter(invitation -> invitation.status() == InvitationStatus.ACTIVE)
                .map(this::accessView);
    }

    @Transactional(readOnly = true)
    public Optional<VerifiedInvitationAccess> verifyAccess(String token) {
        for (InvitationCodeCodec.CodeDigest digest : codec.verificationDigests(token)) {
            Optional<InvitationAccessCode> accessCode = accessCodeRepository()
                    .findByTokenDigestAndPepperVersionAndRevokedAtIsNull(
                            digest.digest(), digest.pepperVersion());
            if (accessCode.isPresent()) {
                InvitationAccessCode code = accessCode.get();
                return invitationRepository()
                        .findById(code.invitationId())
                        .filter(invitation -> invitation.status() == InvitationStatus.ACTIVE)
                        .map(invitation -> new VerifiedInvitationAccess(
                                code.id(), invitation.id(), accessView(invitation)));
            }
        }
        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public Optional<InvitationAccessView> findActiveAccess(UUID invitationId, UUID accessCodeId) {
        if (!accessCodeRepository()
                .existsByIdAndInvitationIdAndRevokedAtIsNull(accessCodeId, invitationId)) {
            return Optional.empty();
        }
        return findActiveAccess(invitationId);
    }

    @Transactional
    public Optional<InvitationAccessView> findActiveAccessForUpdate(UUID invitationId, UUID accessCodeId) {
        return invitationRepository()
                .findByIdForRsvp(invitationId)
                .filter(invitation -> invitation.status() == InvitationStatus.ACTIVE)
                .filter(invitation -> accessCodeRepository()
                        .existsByIdAndInvitationIdAndRevokedAtIsNull(accessCodeId, invitationId))
                .map(this::accessView);
    }

    private InvitationAccessView accessView(Invitation invitation) {
        Set<UUID> guestIds = membershipRepository()
                .findAllByInvitationIdAndUnlinkedAtIsNull(invitation.id())
                .stream()
                .map(InvitationGuest::guestId)
                .collect(Collectors.toSet());
        List<InvitationParticipantView> participants = guests.find(invitation.weddingEventId(), guestIds).stream()
                .filter(GuestSummary::active)
                .sorted(Comparator.comparing(GuestSummary::name))
                .map(guest -> new InvitationParticipantView(guest.id(), guest.name()))
                .toList();
        return new InvitationAccessView(
                invitation.id(),
                invitation.name(),
                invitation.companionLimit(),
                schedule.rsvpDeadline(invitation.weddingEventId()),
                participants);
    }

    private InvitationAccessCodeRepository accessCodeRepository() {
        return accessCodeRepositories.getObject();
    }

    private InvitationRepository invitationRepository() {
        return invitationRepositories.getObject();
    }

    private InvitationGuestRepository membershipRepository() {
        return membershipRepositories.getObject();
    }
}
