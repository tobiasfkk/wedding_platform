package com.tobias.wedding.rsvp;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

record RsvpSubmissionRequest(
        @NotNull(message = "O identificador da operação é obrigatório.") UUID operationId,
        @NotEmpty(message = "Informe ao menos um participante.")
                @Size(max = 100, message = "O convite excede o limite de participantes.")
                List<@Valid RsvpParticipantRequest> participants) {

    RsvpSubmissionRequest {
        participants = participants == null ? null : List.copyOf(participants);
    }
}
