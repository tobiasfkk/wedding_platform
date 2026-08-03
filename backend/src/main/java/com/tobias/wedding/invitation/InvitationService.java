package com.tobias.wedding.invitation;

import com.tobias.wedding.guest.GuestDirectory;
import com.tobias.wedding.guest.GuestSummary;
import com.tobias.wedding.wedding.CurrentWedding;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class InvitationService {

    private final ObjectProvider<InvitationRepository> invitationRepositories;
    private final ObjectProvider<InvitationGuestRepository> membershipRepositories;
    private final CurrentWedding currentWedding;
    private final GuestDirectory guests;

    InvitationService(
            ObjectProvider<InvitationRepository> invitationRepositories,
            ObjectProvider<InvitationGuestRepository> membershipRepositories,
            CurrentWedding currentWedding,
            GuestDirectory guests) {
        this.invitationRepositories = invitationRepositories;
        this.membershipRepositories = membershipRepositories;
        this.currentWedding = currentWedding;
        this.guests = guests;
    }

    @Transactional(readOnly = true)
    InvitationPageResponse findAll(String query, String status, int page, int size) {
        UUID weddingId = currentWedding.requireId();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id")));
        String normalizedQuery = query == null ? "" : query.strip();
        String normalizedStatus = status == null ? "ALL" : status.strip().toUpperCase(Locale.ROOT);
        Page<Invitation> invitations;
        if ("ALL".equals(normalizedStatus)) {
            invitations = invitationRepository()
                    .findByWeddingEventIdAndNameContainingIgnoreCase(weddingId, normalizedQuery, pageable);
        } else {
            InvitationStatus invitationStatus = parseStatus(normalizedStatus);
            invitations = invitationRepository()
                    .findByWeddingEventIdAndNameContainingIgnoreCaseAndStatus(
                            weddingId, normalizedQuery, invitationStatus, pageable);
        }
        List<InvitationResponse> items = invitations.getContent().stream().map(this::response).toList();
        return new InvitationPageResponse(
                items,
                invitations.getNumber(),
                invitations.getSize(),
                invitations.getTotalElements(),
                invitations.getTotalPages());
    }

    @Transactional(readOnly = true)
    List<EligibleGuestResponse> findEligibleGuests(String query, UUID invitationId) {
        UUID weddingId = currentWedding.requireId();
        List<GuestSummary> candidates = guests.searchActive(weddingId, query, 50);
        if (candidates.isEmpty()) {
            return List.of();
        }
        Set<UUID> candidateIds = candidates.stream().map(GuestSummary::id).collect(Collectors.toSet());
        Map<UUID, UUID> currentInvitations = membershipRepository()
                .findAllByGuestIdInAndUnlinkedAtIsNull(candidateIds)
                .stream()
                .collect(Collectors.toMap(InvitationGuest::guestId, InvitationGuest::invitationId));
        return candidates.stream()
                .filter(guest -> {
                    UUID linkedInvitation = currentInvitations.get(guest.id());
                    return linkedInvitation == null || linkedInvitation.equals(invitationId);
                })
                .map(guest -> new EligibleGuestResponse(guest.id(), guest.name()))
                .toList();
    }

    @Transactional
    InvitationResponse create(InvitationRequest request) {
        UUID weddingId = currentWedding.requireId();
        guests.requireActive(weddingId, request.guestIds());
        ensureAvailable(request.guestIds(), null);
        Invitation invitation = invitationRepository()
                .saveAndFlush(Invitation.create(weddingId, request.name(), request.companionLimit()));
        linkMembers(invitation.id(), request.guestIds());
        return response(invitation);
    }

    @Transactional
    InvitationResponse update(UUID id, InvitationRequest request) {
        UUID weddingId = currentWedding.requireId();
        Invitation invitation = invitationRepository()
                .findByIdAndWeddingEventId(id, weddingId)
                .orElseThrow(InvitationNotFoundException::new);
        guests.requireActive(weddingId, request.guestIds());
        ensureAvailable(request.guestIds(), invitation.id());
        invitation.update(request.name(), request.companionLimit());
        synchronizeMembers(invitation.id(), request.guestIds());
        return response(invitationRepository().saveAndFlush(invitation));
    }

    private void synchronizeMembers(UUID invitationId, Set<UUID> desiredIds) {
        List<InvitationGuest> current = membershipRepository()
                .findAllByInvitationIdAndUnlinkedAtIsNull(invitationId);
        Set<UUID> currentIds = current.stream().map(InvitationGuest::guestId).collect(Collectors.toSet());
        current.stream()
                .filter(membership -> !desiredIds.contains(membership.guestId()))
                .forEach(InvitationGuest::unlink);
        membershipRepository().saveAll(current);
        Set<UUID> additions = new HashSet<>(desiredIds);
        additions.removeAll(currentIds);
        linkMembers(invitationId, additions);
    }

    private void linkMembers(UUID invitationId, Collection<UUID> guestIds) {
        try {
            membershipRepository().saveAllAndFlush(
                    guestIds.stream().map(guestId -> InvitationGuest.link(invitationId, guestId)).toList());
        } catch (DataIntegrityViolationException exception) {
            throw new InvitationGuestConflictException();
        }
    }

    private void ensureAvailable(Set<UUID> guestIds, UUID invitationId) {
        boolean conflict = membershipRepository().findAllByGuestIdInAndUnlinkedAtIsNull(guestIds).stream()
                .anyMatch(membership -> !membership.invitationId().equals(invitationId));
        if (conflict) {
            throw new InvitationGuestConflictException();
        }
    }

    private InvitationResponse response(Invitation invitation) {
        List<InvitationGuest> memberships = membershipRepository()
                .findAllByInvitationIdAndUnlinkedAtIsNull(invitation.id());
        Set<UUID> guestIds = memberships.stream().map(InvitationGuest::guestId).collect(Collectors.toSet());
        Map<UUID, GuestSummary> summaries = new HashMap<>(guests.find(invitation.weddingEventId(), guestIds).stream()
                .collect(Collectors.toMap(GuestSummary::id, Function.identity())));
        List<InvitationGuestResponse> guestResponses = memberships.stream()
                .map(membership -> summaries.get(membership.guestId()))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(GuestSummary::name))
                .map(guest -> new InvitationGuestResponse(guest.id(), guest.name(), guest.active()))
                .toList();
        return new InvitationResponse(
                invitation.id(),
                invitation.name(),
                invitation.companionLimit(),
                invitation.status().name(),
                guestResponses,
                invitation.version());
    }

    private InvitationStatus parseStatus(String status) {
        try {
            return InvitationStatus.valueOf(status);
        } catch (IllegalArgumentException exception) {
            throw new InvitationFilterException();
        }
    }

    private InvitationRepository invitationRepository() {
        return invitationRepositories.getObject();
    }

    private InvitationGuestRepository membershipRepository() {
        return membershipRepositories.getObject();
    }
}
