package com.tobias.wedding.invitation;

import java.util.List;
import java.util.UUID;

record InvitationResponse(
        UUID id,
        String name,
        int companionLimit,
        String status,
        List<InvitationGuestResponse> guests,
        long version) {}
