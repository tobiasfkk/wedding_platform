package com.tobias.wedding.rsvp;

record RsvpSessionResponse(
        boolean identified,
        RsvpInvitationResponse invitation,
        String csrfToken) {}
