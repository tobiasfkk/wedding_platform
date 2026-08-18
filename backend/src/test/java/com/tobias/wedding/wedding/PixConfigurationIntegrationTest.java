package com.tobias.wedding.wedding;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class PixConfigurationIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @BeforeEach
    void removeCurrentConfiguration() {
        jdbcClient.sql("DELETE FROM wedding.wedding_event").update();
    }

    @Test
    void exposesOnlyThePublicReadAndProtectsAdministrativeOperations() throws Exception {
        mockMvc.perform(get("/api/public/pix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false));
        mockMvc.perform(get("/api/admin/pix")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/admin/pix")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void validatesPersistsAndPublishesThePixConfiguration() throws Exception {
        mockMvc.perform(put("/api/admin/pix")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.key").value("pix@example.com"))
                .andExpect(jsonPath("$.recipientName").value("Maria e Tobias"));

        mockMvc.perform(get("/api/public/pix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.payload").value(validPayload()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsAnInvalidPixPayload() throws Exception {
        mockMvc.perform(put("/api/admin/pix")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "key": "pix@example.com",
                                  "payload": "texto-que-nao-e-pix",
                                  "recipientName": "Maria e Tobias"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("payload"));
    }

    private String validRequest() {
        return """
                {
                  "key": "pix@example.com",
                  "payload": "%s",
                  "recipientName": "Maria e Tobias"
                }
                """.formatted(validPayload());
    }

    private String validPayload() {
        String value = "00020126330014br.gov.bcb.pix0111pix@example5204000053039865802BR5914MARIA E TOBIAS6008BRASILIA62070503***6304";
        return value + "%04X".formatted(crc16(value));
    }

    private int crc16(String value) {
        int result = 0xFFFF;
        for (byte current : value.getBytes(StandardCharsets.UTF_8)) {
            result ^= (current & 0xFF) << 8;
            for (int bit = 0; bit < 8; bit++) {
                result = (result & 0x8000) != 0 ? (result << 1) ^ 0x1021 : result << 1;
                result &= 0xFFFF;
            }
        }
        return result;
    }
}
