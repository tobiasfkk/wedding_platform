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

    RsvpResponseService(
            RsvpAccessService accessService,
            ObjectProvider<RsvpResponseRepository> responseRepositories,
            ObjectProvider<RsvpSubmissionRepository> submissionRepositories,
            ObjectProvider<RsvpChangeRepository> changeRepositories) {
        this.accessService = accessService;
        this.responseRepositories = responseRepositories;
        this.submissionRepositories = submissionRepositories;
        this.changeRepositories = changeRepositories;
    }

    @Transactional(readOnly = true)
    RsvpInvitationResponse view(InvitationAccessView access) {
        return view(access, currentStatuses(access.invitationId()));
    }

    @Transactional
    RsvpSubmissionResponse submit(RsvpSubmissionRequest request, HttpSession session) {
        InvitationAccessView access = accessService.currentForUpdate(session)
                .orElseThrow(() -> new RsvpAccessException(false));
        Map<UUID, RsvpStatus> requestedStatuses = validateParticipants(access, request.participants());
        String requestHash = requestHash(requestedStatuses);

        var previousSubmission = submissionRepository().findById(request.operationId());
        if (previousSubmission.isPresent()) {
            RsvpSubmission submission = previousSubmission.get();
            if (!submission.matches(access.invitationId(), requestHash)) {
                throw RsvpSubmissionException.reusedOperation();
            }
            return new RsvpSubmissionResponse(
                    submission.submittedAt(), true, view(access, currentStatuses(access.invitationId())));
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
        Map<UUID, RsvpStatus> savedStatuses = current.values().stream()
                .collect(Collectors.toMap(RsvpResponse::guestId, RsvpResponse::status));
        return new RsvpSubmissionResponse(
                submittedAt, false, view(access, savedStatuses));
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

    private RsvpInvitationResponse view(InvitationAccessView access, Map<UUID, RsvpStatus> statuses) {
        List<RsvpParticipantResponse> participants = access.participants().stream()
                .map(participant -> new RsvpParticipantResponse(
                        participant.id(),
                        participant.name(),
                        statuses.getOrDefault(participant.id(), RsvpStatus.PENDING)))
                .toList();
        return new RsvpInvitationResponse(access.groupName(), access.companionLimit(), participants);
    }

    private String requestHash(Map<UUID, RsvpStatus> statuses) {
        String canonical = statuses.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(UUID::toString)))
                .map(entry -> entry.getKey() + "=" + entry.getValue().name())
                .collect(Collectors.joining("\n"));
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
}
