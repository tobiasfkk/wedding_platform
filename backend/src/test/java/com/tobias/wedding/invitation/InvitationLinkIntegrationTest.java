package com.tobias.wedding.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class InvitationLinkIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private InvitationCodeVerifier verifier;

    private UUID weddingId;
    private UUID firstInvitationId;
    private UUID secondInvitationId;

    @BeforeEach
    void prepareData() {
        jdbcClient.sql("DELETE FROM wedding.invitation_access_code").update();
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
        firstInvitationId = createInvitation("Família Exemplo", now);
        secondInvitationId = createInvitation("Amigos", now);
    }

    @Test
    void protectsLinkOperationsFromAnonymousUsers() throws Exception {
        mockMvc.perform(post("/api/admin/invitations/{id}/activate", firstInvitationId).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void activatesRotatesAndInactivatesWithoutPersistingTheToken() throws Exception {
        String firstLink = JsonPath.read(
                mockMvc.perform(post("/api/admin/invitations/{id}/activate", firstInvitationId).with(csrf()))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.invitation.status").value("ACTIVE"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString(),
                "$.link");
        String firstToken = tokenFrom(firstLink);

        assertThat(firstToken).hasSize(43).matches("[A-Za-z0-9_-]{43}");
        assertThat(verifier.findActiveInvitation(firstToken)).contains(firstInvitationId);
        String storedDigest = jdbcClient.sql("SELECT token_digest FROM wedding.invitation_access_code")
                .query(String.class)
                .single();
        assertThat(storedDigest).hasSize(64).doesNotContain(firstToken);

        String secondLink = JsonPath.read(
                mockMvc.perform(post("/api/admin/invitations/{id}/regenerate-link", firstInvitationId)
                                .with(csrf()))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString(),
                "$.link");
        String secondToken = tokenFrom(secondLink);

        assertThat(secondToken).isNotEqualTo(firstToken);
        assertThat(verifier.findActiveInvitation(firstToken)).isEmpty();
        assertThat(verifier.findActiveInvitation(secondToken)).contains(firstInvitationId);
        assertThat(countCodes("revoked_at IS NULL")).isEqualTo(1);
        assertThat(countCodes("revoked_at IS NOT NULL")).isEqualTo(1);
        assertThat(jdbcClient.sql("""
                                SELECT COUNT(*) FROM wedding.invitation_access_code
                                WHERE created_by = 'admin@example.com'
                                  AND (revoked_at IS NULL OR revoked_by = 'admin@example.com')
                                """)
                        .query(Integer.class)
                        .single())
                .isEqualTo(2);

        mockMvc.perform(post("/api/admin/invitations/{id}/inactivate", firstInvitationId).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        assertThat(verifier.findActiveInvitation(secondToken)).isEmpty();
        assertThat(countCodes("revoked_at IS NULL")).isZero();
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void generatesDistinctCodesAndRejectsInvalidStateTransitions() throws Exception {
        String firstLink = activateAndReadLink(firstInvitationId);
        String secondLink = activateAndReadLink(secondInvitationId);

        assertThat(tokenFrom(firstLink)).isNotEqualTo(tokenFrom(secondLink));
        assertThat(jdbcClient.sql("SELECT COUNT(DISTINCT token_digest) FROM wedding.invitation_access_code")
                        .query(Integer.class)
                        .single())
                .isEqualTo(2);

        mockMvc.perform(post("/api/admin/invitations/{id}/activate", firstInvitationId).with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITATION_STATE_CONFLICT"));
    }

    private String activateAndReadLink(UUID invitationId) throws Exception {
        String body = mockMvc.perform(post("/api/admin/invitations/{id}/activate", invitationId).with(csrf()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(body, "$.link");
    }

    private UUID createInvitation(String name, OffsetDateTime now) {
        UUID id = UUID.randomUUID();
        jdbcClient.sql("""
                        INSERT INTO wedding.invitation (
                            id, wedding_event_id, name, companion_limit, status,
                            version, created_at, updated_at
                        ) VALUES (:id, :weddingId, :name, 0, 'DRAFT', 0, :now, :now)
                        """)
                .param("id", id)
                .param("weddingId", weddingId)
                .param("name", name)
                .param("now", now)
                .update();
        return id;
    }

    private int countCodes(String predicate) {
        return jdbcClient.sql("SELECT COUNT(*) FROM wedding.invitation_access_code WHERE " + predicate)
                .query(Integer.class)
                .single();
    }

    private String tokenFrom(String link) {
        return link.substring(link.indexOf("#code=") + 6);
    }
}
