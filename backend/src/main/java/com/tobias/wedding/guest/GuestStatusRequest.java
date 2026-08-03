package com.tobias.wedding.guest;

import jakarta.validation.constraints.NotNull;

record GuestStatusRequest(
        @NotNull(message = "Informe o estado do convidado.") Boolean active) {}
