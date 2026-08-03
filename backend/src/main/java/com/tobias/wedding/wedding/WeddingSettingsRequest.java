package com.tobias.wedding.wedding;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

record WeddingSettingsRequest(
        @NotBlank(message = "Informe o nome de exibição.")
        @Size(max = 160, message = "O nome de exibição deve ter no máximo 160 caracteres.")
        String displayName,
        @NotNull(message = "Informe a data do casamento.")
        LocalDate eventDate,
        @NotNull(message = "Informe o horário do casamento.")
        LocalTime eventTime,
        @NotBlank(message = "Informe o local do casamento.")
        @Size(max = 300, message = "O local deve ter no máximo 300 caracteres.")
        String location,
        @NotNull(message = "Informe a data-limite do RSVP.")
        LocalDate rsvpDeadlineDate,
        @NotNull(message = "Informe o horário-limite do RSVP.")
        LocalTime rsvpDeadlineTime,
        @NotBlank(message = "Informe o fuso horário.")
        @Size(max = 64, message = "O fuso horário deve ter no máximo 64 caracteres.")
        String timeZone) {}
