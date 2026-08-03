package com.tobias.wedding.rsvp;

import java.util.List;

record RsvpInvitationResponse(
        String groupName,
        int companionLimit,
        List<RsvpParticipantResponse> participants) {

    RsvpInvitationResponse {
        participants = List.copyOf(participants);
    }
}
