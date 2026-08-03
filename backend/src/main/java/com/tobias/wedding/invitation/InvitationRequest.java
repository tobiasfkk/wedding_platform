package com.tobias.wedding.invitation;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

record InvitationRequest(
        @NotBlank(message = "Informe o nome do grupo ou responsável.")
        @Size(max = 160, message = "O nome deve ter no máximo 160 caracteres.")
        String name,
        @Min(value = 0, message = "O limite de acompanhantes não pode ser negativo.")
        @Max(value = 100, message = "O limite de acompanhantes deve ser no máximo 100.")
        int companionLimit,
        @NotEmpty(message = "Selecione ao menos um convidado.")
        @Size(max = 100, message = "Um convite deve possuir no máximo 100 convidados.")
        Set<UUID> guestIds) {}
