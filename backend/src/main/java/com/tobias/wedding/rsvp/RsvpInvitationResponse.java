package com.tobias.wedding.rsvp;

import com.tobias.wedding.invitation.InvitationAccessView;
import java.util.List;

record RsvpInvitationResponse(String groupName, int companionLimit, List<String> participants) {

    static RsvpInvitationResponse from(InvitationAccessView access) {
        return new RsvpInvitationResponse(access.groupName(), access.companionLimit(), access.participants());
    }
}
