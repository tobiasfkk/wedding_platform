package com.tobias.wedding.wedding;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class WeddingSettingsIntegrationTest {

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
    void rejectsAnonymousReadsAndWrites() throws Exception {
        mockMvc.perform(get("/api/admin/wedding"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/admin/wedding")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void persistsValidSettingsAndReturnsThemOnReload() throws Exception {
        mockMvc.perform(get("/api/admin/wedding"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false))
                .andExpect(jsonPath("$.timeZone").value("America/Sao_Paulo"));

        mockMvc.perform(put("/api/admin/wedding")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.displayName").value("Ana e Bruno"));

        mockMvc.perform(get("/api/admin/wedding"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventDate").value("2027-05-08"))
                .andExpect(jsonPath("$.eventTime").value("16:00:00"))
                .andExpect(jsonPath("$.location").value("Espaço Jardim"))
                .andExpect(jsonPath("$.rsvpDeadlineDate").value("2027-04-08"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsRequiredFieldsAndDeadlineAfterTheWedding() throws Exception {
        mockMvc.perform(put("/api/admin/wedding")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": " ",
                                  "eventDate": "2027-05-08",
                                  "eventTime": "16:00",
                                  "location": " ",
                                  "rsvpDeadlineDate": "2027-05-09",
                                  "rsvpDeadlineTime": "10:00",
                                  "timeZone": "America/Sao_Paulo"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.length()").value(2));

        mockMvc.perform(put("/api/admin/wedding")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Ana e Bruno",
                                  "eventDate": "2027-05-08",
                                  "eventTime": "16:00",
                                  "location": "Espaço Jardim",
                                  "rsvpDeadlineDate": "2027-05-09",
                                  "rsvpDeadlineTime": "10:00",
                                  "timeZone": "America/Sao_Paulo"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("rsvpDeadlineDate"));
    }

    private String validRequest() {
        return """
                {
                  "displayName": "Ana e Bruno",
                  "eventDate": "2027-05-08",
                  "eventTime": "16:00",
                  "location": "Espaço Jardim",
                  "rsvpDeadlineDate": "2027-04-08",
                  "rsvpDeadlineTime": "23:59",
                  "timeZone": "America/Sao_Paulo"
                }
                """;
    }
}
