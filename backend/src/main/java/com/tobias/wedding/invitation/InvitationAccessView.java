package com.tobias.wedding.invitation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InvitationAccessView(
        UUID invitationId,
        String groupName,
        int companionLimit,
        Instant rsvpDeadline,
        List<InvitationParticipantView> participants) {

    public InvitationAccessView {
        participants = List.copyOf(participants);
    }
}
