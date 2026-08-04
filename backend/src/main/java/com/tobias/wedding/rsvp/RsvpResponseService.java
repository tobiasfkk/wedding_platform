package com.tobias.wedding.rsvp;

import com.tobias.wedding.invitation.InvitationAccessView;
import com.tobias.wedding.invitation.InvitationParticipantView;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class RsvpResponseService {

    private static final String PUBLIC_LINK_ORIGIN = "PUBLIC_LINK";

    private final RsvpAccessService accessService;
    private final ObjectProvider<RsvpResponseRepository> responseRepositories;
    private final ObjectProvider<RsvpSubmissionRepository> submissionRepositories;
    private final ObjectProvider<RsvpChangeRepository> changeRepositories;
    private final ObjectProvider<CompanionRepository> companionRepositories;

    RsvpResponseService(
            RsvpAccessService accessService,
            ObjectProvider<RsvpResponseRepository> responseRepositories,
            ObjectProvider<RsvpSubmissionRepository> submissionRepositories,
            ObjectProvider<RsvpChangeRepository> changeRepositories,
            ObjectProvider<CompanionRepository> companionRepositories) {
        this.accessService = accessService;
        this.responseRepositories = responseRepositories;
        this.submissionRepositories = submissionRepositories;
        this.changeRepositories = changeRepositories;
        this.companionRepositories = companionRepositories;
    }

    @Transactional(readOnly = true)
    RsvpInvitationResponse view(InvitationAccessView access) {
        return view(
                access,
                currentStatuses(access.invitationId()),
                currentCompanions(access.invitationId()));
    }

    @Transactional
    RsvpSubmissionResponse submit(RsvpSubmissionRequest request, HttpSession session) {
        InvitationAccessView access = accessService.currentForUpdate(session)
                .orElseThrow(() -> new RsvpAccessException(false));
        if (!editable(access)) {
            throw RsvpSubmissionException.deadlinePassed();
        }
        Map<UUID, RsvpStatus> requestedStatuses = validateParticipants(access, request.participants());
        Map<UUID, String> requestedCompanions = validateCompanions(access, request.companions());
        String requestHash = requestHash(requestedStatuses, requestedCompanions);

        var previousSubmission = submissionRepository().findById(request.operationId());
        if (previousSubmission.isPresent()) {
            RsvpSubmission submission = previousSubmission.get();
            if (!submission.matches(access.invitationId(), requestHash)) {
                throw RsvpSubmissionException.reusedOperation();
            }
            return new RsvpSubmissionResponse(
                    submission.submittedAt(),
                    true,
                    view(
                            access,
                            currentStatuses(access.invitationId()),
                            currentCompanions(access.invitationId())));
        }

        Instant submittedAt = Instant.now();
        try {
            submissionRepository().saveAndFlush(RsvpSubmission.create(
                    request.operationId(),
                    access.invitationId(),
                    requestHash,
                    PUBLIC_LINK_ORIGIN,
                    submittedAt));
        } catch (DataIntegrityViolationException exception) {
            throw RsvpSubmissionException.reusedOperation();
        }

        Map<UUID, RsvpResponse> current = responseRepository().findAllByInvitationId(access.invitationId()).stream()
                .collect(Collectors.toMap(RsvpResponse::guestId, Function.identity()));
        List<RsvpChange> recordedChanges = access.participants().stream()
                .map(participant -> apply(
                        request.operationId(),
                        access.invitationId(),
                        participant,
                        requestedStatuses.get(participant.id()),
                        submittedAt,
                        current))
                .flatMap(java.util.Optional::stream)
                .toList();

        responseRepository().saveAllAndFlush(current.values());
        changeRepository().saveAllAndFlush(recordedChanges);
        synchronizeCompanions(access.invitationId(), requestedCompanions, submittedAt);
        Map<UUID, RsvpStatus> savedStatuses = current.values().stream()
                .collect(Collectors.toMap(RsvpResponse::guestId, RsvpResponse::status));
        return new RsvpSubmissionResponse(
                submittedAt,
                false,
                view(access, savedStatuses, currentCompanions(access.invitationId())));
    }

    private java.util.Optional<RsvpChange> apply(
            UUID operationId,
            UUID invitationId,
            InvitationParticipantView participant,
            RsvpStatus requestedStatus,
            Instant submittedAt,
            Map<UUID, RsvpResponse> current) {
        RsvpResponse response = current.computeIfAbsent(
                participant.id(),
                id -> RsvpResponse.create(invitationId, id, RsvpStatus.PENDING, submittedAt));
        RsvpStatus previousStatus = response.status();
        if (previousStatus == requestedStatus) {
            return java.util.Optional.empty();
        }
        response.changeTo(requestedStatus, submittedAt);
        return java.util.Optional.of(RsvpChange.create(
                operationId,
                invitationId,
                participant.id(),
                previousStatus,
                requestedStatus,
                PUBLIC_LINK_ORIGIN,
                submittedAt));
    }

    private Map<UUID, RsvpStatus> validateParticipants(
            InvitationAccessView access, List<RsvpParticipantRequest> requestedParticipants) {
        Map<UUID, RsvpStatus> requested = new HashMap<>();
        for (RsvpParticipantRequest participant : requestedParticipants) {
            if (requested.put(participant.participantId(), participant.status()) != null) {
                throw new RsvpSubmissionException();
            }
        }
        Set<UUID> expectedIds = access.participants().stream()
                .map(InvitationParticipantView::id)
                .collect(Collectors.toSet());
        if (!requested.keySet().equals(expectedIds)) {
            throw new RsvpSubmissionException();
        }
        return Map.copyOf(requested);
    }

    private Map<UUID, RsvpStatus> currentStatuses(UUID invitationId) {
        return responseRepository().findAllByInvitationId(invitationId).stream()
                .collect(Collectors.toMap(RsvpResponse::guestId, RsvpResponse::status));
    }

    private List<RsvpCompanionResponse> currentCompanions(UUID invitationId) {
        return companionRepository().findAllByInvitationIdOrderByCreatedAtAscIdAsc(invitationId).stream()
                .filter(Companion::active)
                .map(companion -> new RsvpCompanionResponse(companion.id(), companion.name()))
                .toList();
    }

    private RsvpInvitationResponse view(
            InvitationAccessView access,
            Map<UUID, RsvpStatus> statuses,
            List<RsvpCompanionResponse> companions) {
        List<RsvpParticipantResponse> participants = access.participants().stream()
                .map(participant -> new RsvpParticipantResponse(
                        participant.id(),
                        participant.name(),
                        statuses.getOrDefault(participant.id(), RsvpStatus.PENDING)))
                .toList();
        return new RsvpInvitationResponse(
                access.groupName(), access.companionLimit(), editable(access), participants, companions);
    }

    private boolean editable(InvitationAccessView access) {
        return !Instant.now().isAfter(access.rsvpDeadline());
    }

    private Map<UUID, String> validateCompanions(
            InvitationAccessView access, List<RsvpCompanionRequest> requestedCompanions) {
        if (requestedCompanions.size() > access.companionLimit()) {
            throw RsvpSubmissionException.companionLimitExceeded();
        }
        Map<UUID, String> requested = new HashMap<>();
        for (RsvpCompanionRequest companion : requestedCompanions) {
            String name = companion.name().strip();
            if (name.isEmpty() || requested.put(companion.id(), name) != null) {
                throw RsvpSubmissionException.invalidCompanions();
            }
        }
        if (!requested.isEmpty()) {
            boolean belongsToAnotherInvitation = companionRepository().findAllByIdIn(requested.keySet()).stream()
                    .anyMatch(companion -> !companion.invitationId().equals(access.invitationId()));
            if (belongsToAnotherInvitation) {
                throw RsvpSubmissionException.invalidCompanions();
            }
        }
        return Map.copyOf(requested);
    }

    private void synchronizeCompanions(
            UUID invitationId, Map<UUID, String> requested, Instant submittedAt) {
        Map<UUID, Companion> stored = companionRepository()
                .findAllByInvitationIdOrderByCreatedAtAscIdAsc(invitationId)
                .stream()
                .collect(Collectors.toMap(Companion::id, Function.identity()));
        stored.values().stream()
                .filter(Companion::active)
                .filter(companion -> !requested.containsKey(companion.id()))
                .forEach(companion -> companion.remove(submittedAt));
        requested.forEach((id, name) -> stored.compute(id, (ignored, companion) -> {
            if (companion == null) {
                return Companion.create(id, invitationId, name, submittedAt);
            }
            companion.update(name);
            return companion;
        }));
        try {
            companionRepository().saveAllAndFlush(stored.values());
        } catch (DataIntegrityViolationException exception) {
            throw RsvpSubmissionException.invalidCompanions();
        }
    }

    private String requestHash(Map<UUID, RsvpStatus> statuses, Map<UUID, String> companions) {
        String participantPart = statuses.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(UUID::toString)))
                .map(entry -> "P:" + entry.getKey() + "=" + entry.getValue().name())
                .collect(Collectors.joining("\n"));
        String companionPart = companions.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(UUID::toString)))
                .map(entry -> "C:" + entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("\n"));
        String canonical = participantPart + "\n" + companionPart;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private RsvpResponseRepository responseRepository() {
        return responseRepositories.getObject();
    }

    private RsvpSubmissionRepository submissionRepository() {
        return submissionRepositories.getObject();
    }

    private RsvpChangeRepository changeRepository() {
        return changeRepositories.getObject();
    }

    private CompanionRepository companionRepository() {
        return companionRepositories.getObject();
    }
}
