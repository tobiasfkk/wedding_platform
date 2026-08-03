package com.tobias.wedding.invitation;

import java.util.List;

public record InvitationAccessView(String groupName, int companionLimit, List<String> participants) {

    public InvitationAccessView {
        participants = List.copyOf(participants);
    }
}
