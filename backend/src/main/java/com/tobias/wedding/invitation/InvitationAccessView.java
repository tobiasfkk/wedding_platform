package com.tobias.wedding.invitation;

import java.util.List;
import java.util.UUID;

public record InvitationAccessView(
        UUID invitationId,
        String groupName,
        int companionLimit,
        List<InvitationParticipantView> participants) {

    public InvitationAccessView {
        participants = List.copyOf(participants);
    }
}
