package com.tobias.wedding.rsvp;

record AdminRsvpResponse(boolean hasExistingResponse, RsvpInvitationResponse invitation) {}
