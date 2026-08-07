package com.tobias.wedding.site;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

record WeddingSiteDraftRequest(
        @Min(value = 0, message = "A versão do rascunho é inválida.") long version,
        @NotNull @Valid WeddingSiteContent content) {}
