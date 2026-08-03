package com.tobias.wedding.guest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

record GuestRequest(
        @NotBlank(message = "Informe o nome completo.")
        @Size(max = 160, message = "O nome deve ter no máximo 160 caracteres.")
        String name,
        @Size(max = 254, message = "O contato deve ter no máximo 254 caracteres.")
        String contact,
        @NotNull(message = "Informe o estado do convidado.")
        Boolean active) {}
