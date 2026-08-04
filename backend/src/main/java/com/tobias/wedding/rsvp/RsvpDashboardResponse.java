package com.tobias.wedding.rsvp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record RsvpDashboardResponse(
        RsvpDashboardTotals totals,
        List<RsvpDashboardInvitation> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {}

record RsvpDashboardTotals(long confirmed, long declined, long pending) {}

record RsvpDashboardInvitation(
        UUID invitationId,
        String groupName,
        long confirmed,
        long declined,
        long pending,
        Instant updatedAt,
        List<RsvpDashboardParticipant> participants,
        List<RsvpCompanionResponse> companions) {}

record RsvpDashboardParticipant(UUID id, String name, RsvpStatus status) {}
