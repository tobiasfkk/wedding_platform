package com.tobias.wedding.rsvp;

import java.util.UUID;

record RsvpParticipantResponse(UUID id, String name, RsvpStatus status) {}
