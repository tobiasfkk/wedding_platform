package com.tobias.wedding.wedding;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

record RsvpDeadlineRequest(
        @NotNull(message = "Informe a data-limite do RSVP.") LocalDate deadlineDate,
        @NotNull(message = "Informe o horário-limite do RSVP.") LocalTime deadlineTime,
        @NotBlank(message = "Informe o fuso horário.")
        @Size(max = 64, message = "O fuso horário deve ter no máximo 64 caracteres.")
        String timeZone) {}
