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
                List<@Valid RsvpParticipantRequest> participants,
        @NotNull(message = "Informe a lista de acompanhantes.")
                @Size(max = 100, message = "O convite excede o limite de acompanhantes.")
                List<@Valid RsvpCompanionRequest> companions) {

    RsvpSubmissionRequest {
        participants = participants == null ? null : List.copyOf(participants);
        companions = companions == null ? null : List.copyOf(companions);
    }
}
