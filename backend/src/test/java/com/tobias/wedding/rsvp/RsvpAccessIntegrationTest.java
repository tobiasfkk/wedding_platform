package com.tobias.wedding.rsvp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class RsvpAccessIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID weddingId;
    private UUID invitationId;
    private UUID otherInvitationId;

    @BeforeEach
    void prepareData() {
        jdbcClient.sql("DELETE FROM wedding.invitation_access_code").update();
        jdbcClient.sql("DELETE FROM wedding.invitation_guest").update();
        jdbcClient.sql("DELETE FROM wedding.invitation").update();
        jdbcClient.sql("DELETE FROM wedding.guest").update();
        jdbcClient.sql("DELETE FROM wedding.wedding_event").update();
        weddingId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        createWedding(now);
        invitationId = createInvitation("Família Exemplo", 2, now);
        otherInvitationId = createInvitation("Outro grupo secreto", 0, now);
        linkGuest(invitationId, createGuest("Ana Exemplo", now), now);
        linkGuest(invitationId, createGuest("Bruno Exemplo", now), now);
        linkGuest(otherInvitationId, createGuest("Pessoa de outro convite", now), now);
    }

    @Test
    void exchangesAValidCodeForAnInvitationLimitedSession() throws Exception {
        String token = activateAndReadToken(invitationId);

        var accessResult = mockMvc.perform(post("/api/rsvp/access")
                        .with(csrf())
                        .with(remoteOrigin("198.51.100.20"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + token + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groupName").value("Família Exemplo"))
                .andExpect(jsonPath("$.companionLimit").value(2))
                .andExpect(jsonPath("$.participants.length()").value(2))
                .andExpect(jsonPath("$.participants[?(@ == 'Ana Exemplo')]").isNotEmpty())
                .andExpect(jsonPath("$.participants[?(@ == 'Pessoa de outro convite')]").isEmpty())
                .andReturn();
        MockHttpSession session = (MockHttpSession) accessResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/rsvp/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identified").value(true))
                .andExpect(jsonPath("$.invitation.groupName").value("Família Exemplo"))
                .andExpect(jsonPath("$.csrfToken").isNotEmpty());

        assertThat(session.getAttribute(RsvpAccessService.INVITATION_SESSION_ATTRIBUTE))
                .isEqualTo(invitationId.toString());
        assertThat(Collections.list(session.getAttributeNames()))
                .noneMatch(value -> token.equals(String.valueOf(session.getAttribute(value))));

        regenerateAndReadToken(invitationId);
        mockMvc.perform(get("/api/rsvp/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identified").value(false))
                .andExpect(jsonPath("$.invitation").doesNotExist());
    }

    @Test
    void givesTheSameSafeResponseForRandomOldAndInactiveCodes() throws Exception {
        String firstToken = activateAndReadToken(invitationId);
        String secondToken = regenerateAndReadToken(invitationId);

        expectInvalid(firstToken, "198.51.100.30");
        expectInvalid("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "198.51.100.31");

        mockMvc.perform(post("/api/admin/invitations/{id}/inactivate", invitationId)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isOk());
        expectInvalid(secondToken, "198.51.100.32");
    }

    @Test
    void limitsExcessiveInvalidAttemptsWithoutExposingInvitationData() throws Exception {
        for (int attempt = 0; attempt < 10; attempt++) {
            expectInvalid("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" + attempt, "198.51.100.40");
        }

        mockMvc.perform(post("/api/rsvp/access")
                        .with(csrf())
                        .with(remoteOrigin("198.51.100.40"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RSVP_ACCESS_RATE_LIMITED"))
                .andExpect(jsonPath("$.groupName").doesNotExist());
    }

    private void expectInvalid(String token, String origin) throws Exception {
        mockMvc.perform(post("/api/rsvp/access")
                        .with(csrf())
                        .with(remoteOrigin(origin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + token + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("RSVP_ACCESS_INVALID"))
                .andExpect(jsonPath("$.detail").value(
                        "Não foi possível abrir este convite. Confira o link recebido ou fale com os responsáveis pelo evento."))
                .andExpect(jsonPath("$.groupName").doesNotExist());
    }

    private String activateAndReadToken(UUID id) throws Exception {
        String body = mockMvc.perform(post("/api/admin/invitations/{id}/activate", id)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return tokenFrom(JsonPath.read(body, "$.link"));
    }

    private String regenerateAndReadToken(UUID id) throws Exception {
        String body = mockMvc.perform(post("/api/admin/invitations/{id}/regenerate-link", id)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return tokenFrom(JsonPath.read(body, "$.link"));
    }

    private void createWedding(OffsetDateTime now) {
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

    private UUID createInvitation(String name, int companionLimit, OffsetDateTime now) {
        UUID id = UUID.randomUUID();
        jdbcClient.sql("""
                        INSERT INTO wedding.invitation (
                            id, wedding_event_id, name, companion_limit, status,
                            version, created_at, updated_at
                        ) VALUES (:id, :weddingId, :name, :limit, 'DRAFT', 0, :now, :now)
                        """)
                .param("id", id)
                .param("weddingId", weddingId)
                .param("name", name)
                .param("limit", companionLimit)
                .param("now", now)
                .update();
        return id;
    }

    private UUID createGuest(String name, OffsetDateTime now) {
        UUID id = UUID.randomUUID();
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

    private void linkGuest(UUID targetInvitationId, UUID guestId, OffsetDateTime now) {
        jdbcClient.sql("""
                        INSERT INTO wedding.invitation_guest (
                            id, invitation_id, guest_id, linked_at, unlinked_at
                        ) VALUES (:id, :invitationId, :guestId, :now, NULL)
                        """)
                .param("id", UUID.randomUUID())
                .param("invitationId", targetInvitationId)
                .param("guestId", guestId)
                .param("now", now)
                .update();
    }

    private RequestPostProcessor remoteOrigin(String origin) {
        return request -> {
            request.setRemoteAddr(origin);
            return request;
        };
    }

    private String tokenFrom(String link) {
        return link.substring(link.indexOf("#code=") + 6);
    }
}
