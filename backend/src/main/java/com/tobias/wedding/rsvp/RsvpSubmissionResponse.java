package com.tobias.wedding.rsvp;

import java.time.Instant;

record RsvpSubmissionResponse(
        Instant savedAt,
        boolean replayed,
        RsvpInvitationResponse invitation) {}
