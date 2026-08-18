package com.tobias.wedding.wedding;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record PixConfigurationRequest(
        @Size(max = 140, message = "A chave Pix deve ter no máximo 140 caracteres.") String key,
        @NotBlank(message = "Informe o código Pix Copia e Cola.")
        @Size(max = 2048, message = "O código Pix deve ter no máximo 2048 caracteres.")
        String payload,
        @NotBlank(message = "Informe o nome do recebedor.")
        @Size(max = 160, message = "O nome do recebedor deve ter no máximo 160 caracteres.")
        String recipientName) {}
