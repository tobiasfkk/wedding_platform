package com.tobias.wedding.rsvp;

import java.util.List;

record RsvpInvitationResponse(
        String groupName,
        int companionLimit,
        boolean editable,
        List<RsvpParticipantResponse> participants,
        List<RsvpCompanionResponse> companions) {

    RsvpInvitationResponse {
        participants = List.copyOf(participants);
        companions = List.copyOf(companions);
    }
}
