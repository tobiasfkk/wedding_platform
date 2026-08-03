package com.tobias.wedding.guest;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
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
class GuestManagementIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID weddingId;

    @BeforeEach
    void prepareWedding() {
        jdbcClient.sql("DELETE FROM wedding.guest").update();
        jdbcClient.sql("DELETE FROM wedding.wedding_event").update();
        weddingId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                        INSERT INTO wedding.wedding_event (
                            id, display_name, starts_at, rsvp_deadline, time_zone, location,
                            version, created_at, updated_at
                        ) VALUES (
                            :id, 'Casamento de teste', :startsAt, :deadline, 'America/Sao_Paulo',
                            'Local de teste', 0, :now, :now
                        )
                        """)
                .param("id", weddingId)
                .param("startsAt", OffsetDateTime.parse("2027-05-08T19:00:00Z"))
                .param("deadline", OffsetDateTime.parse("2027-04-08T02:59:00Z"))
                .param("now", now)
                .update();
    }

    @Test
    void protectsGuestManagementFromAnonymousUsers() throws Exception {
        mockMvc.perform(get("/api/admin/guests"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/admin/guests")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validGuest("Ana Exemplo")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createsSearchesUpdatesAndLogicallyDeactivatesAGuest() throws Exception {
        mockMvc.perform(post("/api/admin/guests")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validGuest("Ana Exemplo")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Ana Exemplo"))
                .andExpect(jsonPath("$.active").value(true));

        UUID id = jdbcClient.sql("SELECT id FROM wedding.guest WHERE name = 'Ana Exemplo'")
                .query(UUID.class)
                .single();

        mockMvc.perform(get("/api/admin/guests")
                        .queryParam("query", "ana")
                        .queryParam("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Ana Exemplo"));

        mockMvc.perform(put("/api/admin/guests/{id}", id)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Ana Atualizada","contact":"novo contato","active":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ana Atualizada"));

        mockMvc.perform(patch("/api/admin/guests/{id}/status", id)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/admin/guests").queryParam("status", "INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Ana Atualizada"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void validatesPersonalDataAndPaginatesCollections() throws Exception {
        mockMvc.perform(post("/api/admin/guests")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \",\"contact\":\"contato\",\"active\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("name"));

        createGuestDirectly("Ana");
        createGuestDirectly("Bruno");
        createGuestDirectly("Carla");

        mockMvc.perform(get("/api/admin/guests")
                        .queryParam("page", "0")
                        .queryParam("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    private String validGuest(String name) {
        return """
                {"name":"%s","contact":"contato opcional","active":true}
                """.formatted(name);
    }

    private void createGuestDirectly(String name) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                        INSERT INTO wedding.guest (
                            id, wedding_event_id, name, contact, active, version,
                            created_at, updated_at, deactivated_at
                        ) VALUES (:id, :weddingId, :name, NULL, true, 0, :now, :now, NULL)
                        """)
                .param("id", UUID.randomUUID())
                .param("weddingId", weddingId)
                .param("name", name)
                .param("now", now)
                .update();
    }
}
