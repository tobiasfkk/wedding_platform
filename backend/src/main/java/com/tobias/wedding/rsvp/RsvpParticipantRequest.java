package com.tobias.wedding.rsvp;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

record RsvpParticipantRequest(
        @NotNull(message = "O participante é obrigatório.") UUID participantId,
        @NotNull(message = "A resposta é obrigatória.") RsvpStatus status) {}
