package com.tobias.wedding.rsvp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record RsvpAccessRequest(
        @NotBlank(message = "O código do convite deve ser informado.")
        @Size(max = 128, message = "O código do convite é inválido.")
        String code) {}
