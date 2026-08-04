package com.tobias.wedding.rsvp;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

record AdminRsvpRequest(
        @NotNull(message = "O identificador da operação é obrigatório.") UUID operationId,
        boolean replaceExisting,
        @NotNull(message = "As respostas dos participantes são obrigatórias.")
                @Size(min = 1, max = 100, message = "Informe entre 1 e 100 participantes.")
                List<@Valid RsvpParticipantRequest> participants,
        @NotNull(message = "A lista de acompanhantes é obrigatória.")
                @Size(max = 100, message = "Informe no máximo 100 acompanhantes.")
                List<@Valid RsvpCompanionRequest> companions) {

    AdminRsvpRequest {
        participants = participants == null ? null : List.copyOf(participants);
        companions = companions == null ? null : List.copyOf(companions);
    }
}
