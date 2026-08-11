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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class RsvpDeadlineIntegrationTest {

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
        mockMvc.perform(get("/api/admin/rsvp/deadline"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/admin/rsvp/deadline")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void persistsTheDeadlineAndReturnsItOnReload() throws Exception {
        mockMvc.perform(get("/api/admin/rsvp/deadline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false))
                .andExpect(jsonPath("$.timeZone").value("America/Sao_Paulo"));

        mockMvc.perform(put("/api/admin/rsvp/deadline")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.deadlineDate").value("2027-04-08"))
                .andExpect(jsonPath("$.deadlineTime").value("23:59:00"));

        mockMvc.perform(get("/api/admin/rsvp/deadline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deadlineDate").value("2027-04-08"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsMissingFieldsAndInvalidTimeZone() throws Exception {
        mockMvc.perform(put("/api/admin/rsvp/deadline")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeZone\":\"America/Sao_Paulo\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.length()").value(2));

        mockMvc.perform(put("/api/admin/rsvp/deadline")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "deadlineDate": "2027-04-08",
                                  "deadlineTime": "23:59",
                                  "timeZone": "fuso-invalido"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("timeZone"));
    }

    private String validRequest() {
        return """
                {
                  "deadlineDate": "2027-04-08",
                  "deadlineTime": "23:59",
                  "timeZone": "America/Sao_Paulo"
                }
                """;
    }
}
