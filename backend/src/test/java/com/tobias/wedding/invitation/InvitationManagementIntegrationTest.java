package com.tobias.wedding.invitation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class InvitationManagementIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID weddingId;
    private UUID anaId;
    private UUID brunoId;
    private UUID carlaId;

    @BeforeEach
    void prepareData() {
        jdbcClient.sql("DELETE FROM wedding.invitation_guest").update();
        jdbcClient.sql("DELETE FROM wedding.invitation").update();
        jdbcClient.sql("DELETE FROM wedding.guest").update();
        jdbcClient.sql("DELETE FROM wedding.wedding_event").update();
        weddingId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                        INSERT INTO wedding.wedding_event (id, created_at)
                        VALUES (:id, :now)
                        """)
                .param("id", weddingId)
                .param("now", now)
                .update();
        anaId = createGuest("Ana");
        brunoId = createGuest("Bruno");
        carlaId = createGuest("Carla");
    }

    @Test
    void protectsInvitationManagementFromAnonymousUsers() throws Exception {
        mockMvc.perform(get("/api/admin/invitations"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/invitations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Família Exemplo", 1, anaId)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createsListsAndUpdatesAnInvitationTransactionally() throws Exception {
        mockMvc.perform(post("/api/admin/invitations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Família Exemplo", 2, anaId, brunoId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Família Exemplo"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.guests.length()").value(2));

        UUID invitationId = jdbcClient.sql("SELECT id FROM wedding.invitation WHERE name = 'Família Exemplo'")
                .query(UUID.class)
                .single();

        mockMvc.perform(get("/api/admin/invitations").queryParam("query", "família"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].companionLimit").value(2));

        mockMvc.perform(put("/api/admin/invitations/{id}", invitationId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Amigos", 0, brunoId, carlaId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Amigos"))
                .andExpect(jsonPath("$.guests.length()").value(2));

        Integer currentLinks = jdbcClient.sql("""
                        SELECT COUNT(*) FROM wedding.invitation_guest
                        WHERE invitation_id = :invitationId AND unlinked_at IS NULL
                        """)
                .param("invitationId", invitationId)
                .query(Integer.class)
                .single();
        Integer historicalLinks = jdbcClient.sql("""
                        SELECT COUNT(*) FROM wedding.invitation_guest
                        WHERE invitation_id = :invitationId AND unlinked_at IS NOT NULL
                        """)
                .param("invitationId", invitationId)
                .query(Integer.class)
                .single();
        org.assertj.core.api.Assertions.assertThat(currentLinks).isEqualTo(2);
        org.assertj.core.api.Assertions.assertThat(historicalLinks).isEqualTo(1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsInvalidGroupsAndGuestsAlreadyLinkedToAnotherInvitation() throws Exception {
        mockMvc.perform(post("/api/admin/invitations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Grupo inválido","companionLimit":-1,"guestIds":[]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/admin/invitations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Primeiro grupo", 0, anaId)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/invitations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Segundo grupo", 0, anaId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITATION_GUEST_CONFLICT"));

        mockMvc.perform(get("/api/admin/invitations/eligible-guests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Ana')]").isEmpty())
                .andExpect(jsonPath("$[?(@.name == 'Bruno')]").isNotEmpty());
    }

    private UUID createGuest(String name) {
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcClient.sql("""
                        INSERT INTO wedding.guest (
                            id, wedding_event_id, name, contact, active, version,
                            created_at, updated_at, deactivated_at
                        ) VALUES (:id, :weddingId, :name, NULL, true, 0, :now, :now, NULL)
                        """)
                .param("id", id)
                .param("weddingId", weddingId)
                .param("name", name)
                .param("now", now)
                .update();
        return id;
    }

    private String request(String name, int companionLimit, UUID... guestIds) {
        String ids = java.util.Arrays.stream(guestIds)
                .map(id -> "\"" + id + "\"")
                .collect(java.util.stream.Collectors.joining(","));
        return """
                {"name":"%s","companionLimit":%d,"guestIds":[%s]}
                """.formatted(name, companionLimit, ids);
    }
}
