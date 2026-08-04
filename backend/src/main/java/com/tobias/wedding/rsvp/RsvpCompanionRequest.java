package com.tobias.wedding.rsvp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

record RsvpCompanionRequest(
        @NotNull(message = "O identificador do acompanhante é obrigatório.") UUID id,
        @NotBlank(message = "Informe o nome do acompanhante.")
                @Size(max = 160, message = "O nome deve ter no máximo 160 caracteres.")
                String name) {}
