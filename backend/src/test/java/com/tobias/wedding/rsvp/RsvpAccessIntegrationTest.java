package com.tobias.wedding.rsvp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
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

    @Autowired
    private RsvpResponseService responseService;

    private UUID weddingId;
    private UUID invitationId;
    private UUID otherInvitationId;
    private UUID firstGuestId;
    private UUID secondGuestId;
    private UUID otherGuestId;

    @BeforeEach
    void prepareData() {
        jdbcClient.sql("DELETE FROM wedding.companion").update();
        jdbcClient.sql("DELETE FROM wedding.rsvp_change").update();
        jdbcClient.sql("DELETE FROM wedding.rsvp_response").update();
        jdbcClient.sql("DELETE FROM wedding.rsvp_submission").update();
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
        firstGuestId = createGuest("Ana Exemplo", now);
        secondGuestId = createGuest("Bruno Exemplo", now);
        otherGuestId = createGuest("Pessoa de outro convite", now);
        linkGuest(invitationId, firstGuestId, now);
        linkGuest(invitationId, secondGuestId, now);
        linkGuest(otherInvitationId, otherGuestId, now);
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
                .andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.participants.length()").value(2))
                .andExpect(jsonPath("$.participants[?(@.name == 'Ana Exemplo')]").isNotEmpty())
                .andExpect(jsonPath("$.participants[0].status").value("PENDING"))
                .andExpect(jsonPath("$.participants[1].status").value("PENDING"))
                .andExpect(jsonPath("$.companions.length()").value(0))
                .andExpect(jsonPath("$.participants[?(@.name == 'Pessoa de outro convite')]").isEmpty())
                .andReturn();
        Cookie sessionCookie = accessResult.getResponse().getCookie("SESSION");
        assertThat(sessionCookie).isNotNull();

        mockMvc.perform(get("/api/rsvp/session").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identified").value(true))
                .andExpect(jsonPath("$.invitation.groupName").value("Família Exemplo"))
                .andExpect(jsonPath("$.invitation.participants[0].id").isNotEmpty())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty());

        regenerateAndReadToken(invitationId);
        mockMvc.perform(get("/api/rsvp/session").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identified").value(false))
                .andExpect(jsonPath("$.invitation").doesNotExist());
    }

    @Test
    void savesTheWholeInvitationAtomicallyAndReplaysTheSameOperationWithoutDuplicates() throws Exception {
        Cookie sessionCookie = accessSession(activateAndReadToken(invitationId), "198.51.100.50");
        UUID operationId = UUID.randomUUID();
        String request = submission(operationId, firstGuestId, "CONFIRMED", secondGuestId, "DECLINED");

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(false))
                .andExpect(jsonPath("$.savedAt").isNotEmpty())
                .andExpect(jsonPath("$.invitation.participants[0].id").value(firstGuestId.toString()))
                .andExpect(jsonPath("$.invitation.participants[0].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.invitation.participants[1].id").value(secondGuestId.toString()))
                .andExpect(jsonPath("$.invitation.participants[1].status").value("DECLINED"));

        assertThat(count("wedding.rsvp_submission")).isEqualTo(1);
        assertThat(count("wedding.rsvp_response")).isEqualTo(2);
        assertThat(count("wedding.rsvp_change")).isEqualTo(2);
        assertThat(jdbcClient.sql("SELECT DISTINCT origin FROM wedding.rsvp_change")
                        .query(String.class)
                        .list())
                .containsExactly("PUBLIC_LINK");

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true));

        assertThat(count("wedding.rsvp_submission")).isEqualTo(1);
        assertThat(count("wedding.rsvp_response")).isEqualTo(2);
        assertThat(count("wedding.rsvp_change")).isEqualTo(2);

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(operationId, firstGuestId, "DECLINED", secondGuestId, "DECLINED")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RSVP_SUBMISSION_CONFLICT"));
    }

    @Test
    void rejectsAParticipantFromAnotherInvitationWithoutSavingAnyPartOfTheGroup() throws Exception {
        Cookie sessionCookie = accessSession(activateAndReadToken(invitationId), "198.51.100.51");

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(), firstGuestId, "CONFIRMED", otherGuestId, "CONFIRMED")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RSVP_SUBMISSION_CONFLICT"));

        assertThat(count("wedding.rsvp_submission")).isZero();
        assertThat(count("wedding.rsvp_response")).isZero();
        assertThat(count("wedding.rsvp_change")).isZero();
    }

    @Test
    void addsEditsRemovesAndReplaysCompanionsWithoutDuplicates() throws Exception {
        Cookie sessionCookie = accessSession(activateAndReadToken(invitationId), "198.51.100.52");
        UUID firstCompanionId = UUID.randomUUID();
        UUID secondCompanionId = UUID.randomUUID();
        String companions = companions(
                firstCompanionId, "Carla Exemplo", secondCompanionId, "Diego Exemplo");
        String request = submission(
                UUID.randomUUID(), firstGuestId, "CONFIRMED", secondGuestId, "DECLINED", companions);

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitation.companions.length()").value(2))
                .andExpect(jsonPath("$.invitation.companions[?(@.name == 'Carla Exemplo')]").isNotEmpty());

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true));
        assertThat(count("wedding.companion")).isEqualTo(2);

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(),
                                firstGuestId,
                                "CONFIRMED",
                                secondGuestId,
                                "DECLINED",
                                "[{\"id\":\"" + firstCompanionId + "\",\"name\":\"Carla Atualizada\"}]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitation.companions.length()").value(1))
                .andExpect(jsonPath("$.invitation.companions[0].id").value(firstCompanionId.toString()))
                .andExpect(jsonPath("$.invitation.companions[0].name").value("Carla Atualizada"));

        assertThat(countWhere("wedding.companion", "removed_at IS NULL")).isEqualTo(1);
        assertThat(countWhere("wedding.companion", "removed_at IS NOT NULL")).isEqualTo(1);
    }

    @Test
    void rejectsInvalidCompanionsAndPreservesThePreviousResponse() throws Exception {
        Cookie sessionCookie = accessSession(activateAndReadToken(invitationId), "198.51.100.53");
        UUID companionId = UUID.randomUUID();
        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(),
                                firstGuestId,
                                "CONFIRMED",
                                secondGuestId,
                                "DECLINED",
                                "[{\"id\":\"" + companionId + "\",\"name\":\"Carla\"}]")))
                .andExpect(status().isOk());

        String overLimit = companions(
                UUID.randomUUID(), "Um", UUID.randomUUID(), "Dois").replace(
                        "]", ",{\"id\":\"" + UUID.randomUUID() + "\",\"name\":\"Três\"}]");
        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(), firstGuestId, "DECLINED", secondGuestId, "DECLINED", overLimit)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RSVP_SUBMISSION_CONFLICT"));

        assertThat(countWhere("wedding.companion", "removed_at IS NULL")).isEqualTo(1);
        assertThat(jdbcClient.sql("SELECT name FROM wedding.companion WHERE id = :id")
                        .param("id", companionId)
                        .query(String.class)
                        .single())
                .isEqualTo("Carla");
        assertThat(jdbcClient.sql("SELECT status FROM wedding.rsvp_response WHERE guest_id = :id")
                        .param("id", firstGuestId)
                        .query(String.class)
                        .single())
                .isEqualTo("CONFIRMED");

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(),
                                firstGuestId,
                                "CONFIRMED",
                                secondGuestId,
                                "DECLINED",
                                "[{\"id\":\"" + companionId + "\",\"name\":\"   \"}]")))
                .andExpect(status().isBadRequest());
        assertThat(countWhere("wedding.companion", "removed_at IS NULL")).isEqualTo(1);
    }

    @Test
    void doesNotAllowCompanionsWhenTheLimitIsZero() throws Exception {
        Cookie sessionCookie = accessSession(activateAndReadToken(otherInvitationId), "198.51.100.54");
        String request = """
                {
                  "operationId": "%s",
                  "participants": [{"participantId": "%s", "status": "CONFIRMED"}],
                  "companions": [{"id": "%s", "name": "Sem vaga"}]
                }
                """.formatted(UUID.randomUUID(), otherGuestId, UUID.randomUUID());

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict());
        assertThat(count("wedding.companion")).isZero();
    }

    @Test
    void serializesConcurrentCompanionChangesInsideTheLimit() throws Exception {
        activateAndReadToken(invitationId);
        jdbcClient.sql("UPDATE wedding.invitation SET companion_limit = 1 WHERE id = :id")
                .param("id", invitationId)
                .update();
        UUID accessCodeId = jdbcClient.sql(
                        "SELECT id FROM wedding.invitation_access_code "
                                + "WHERE invitation_id = :id AND revoked_at IS NULL")
                .param("id", invitationId)
                .query(UUID.class)
                .single();
        MockHttpSession firstSession = rsvpSession(accessCodeId);
        MockHttpSession secondSession = rsvpSession(accessCodeId);
        RsvpSubmissionRequest firstRequest = concurrentSubmission("Primeiro acompanhante");
        RsvpSubmissionRequest secondRequest = concurrentSubmission("Segundo acompanhante");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> submitAfterBarrier(firstRequest, firstSession, ready, start));
            var second = executor.submit(() -> submitAfterBarrier(secondRequest, secondSession, ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isNotNull();
            assertThat(second.get(10, TimeUnit.SECONDS)).isNotNull();
        }

        assertThat(countWhere("wedding.companion", "removed_at IS NULL")).isEqualTo(1);
    }

    @Test
    void preservesTheLatestResponseAndRejectsChangesAfterTheDeadline() throws Exception {
        Cookie sessionCookie = accessSession(activateAndReadToken(invitationId), "198.51.100.55");
        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(), firstGuestId, "CONFIRMED", secondGuestId, "DECLINED")))
                .andExpect(status().isOk());

        jdbcClient.sql("UPDATE wedding.wedding_event SET rsvp_deadline = :deadline WHERE id = :id")
                .param("deadline", OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1))
                .param("id", weddingId)
                .update();

        mockMvc.perform(get("/api/rsvp/session").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitation.editable").value(false))
                .andExpect(jsonPath("$.invitation.participants[0].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.invitation.participants[1].status").value("DECLINED"));

        mockMvc.perform(post("/api/rsvp/responses")
                        .cookie(sessionCookie)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(
                                UUID.randomUUID(), firstGuestId, "DECLINED", secondGuestId, "CONFIRMED")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RSVP_SUBMISSION_CONFLICT"))
                .andExpect(jsonPath("$.detail").value(
                        "O prazo para alterar a confirmação de presença já foi encerrado."));

        assertThat(count("wedding.rsvp_submission")).isEqualTo(1);
        assertThat(count("wedding.rsvp_change")).isEqualTo(2);
        assertThat(jdbcClient.sql("SELECT status FROM wedding.rsvp_response WHERE guest_id = :id")
                        .param("id", firstGuestId)
                        .query(String.class)
                        .single())
                .isEqualTo("CONFIRMED");
    }

    @Test
    void administratorCorrectsResponsesAfterTheDeadlineWithConfirmationAndAudit() throws Exception {
        jdbcClient.sql("UPDATE wedding.wedding_event SET rsvp_deadline = :deadline WHERE id = :id")
                .param("deadline", OffsetDateTime.now(ZoneOffset.UTC).minusDays(1))
                .param("id", weddingId)
                .update();
        UUID companionId = UUID.randomUUID();

        mockMvc.perform(get("/api/admin/invitations/{id}/rsvp", invitationId)
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasExistingResponse").value(false))
                .andExpect(jsonPath("$.invitation.groupName").value("Família Exemplo"));

        mockMvc.perform(put("/api/admin/invitations/{id}/rsvp", invitationId)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adminSubmission(
                                UUID.randomUUID(),
                                false,
                                "CONFIRMED",
                                "DECLINED",
                                "[{\"id\":\"" + companionId + "\",\"name\":\"Carla\"}]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasExistingResponse").value(true));

        assertThat(jdbcClient.sql("SELECT origin FROM wedding.rsvp_submission")
                        .query(String.class)
                        .single())
                .isEqualTo("ADMIN");
        assertThat(jdbcClient.sql("SELECT submitted_by FROM wedding.rsvp_submission")
                        .query(String.class)
                        .single())
                .isEqualTo("admin@example.com");
        assertThat(jdbcClient.sql("SELECT DISTINCT changed_by FROM wedding.rsvp_change")
                        .query(String.class)
                        .list())
                .containsExactly("admin@example.com");

        mockMvc.perform(put("/api/admin/invitations/{id}/rsvp", invitationId)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adminSubmission(
                                UUID.randomUUID(), false, "DECLINED", "CONFIRMED", "[]")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "Confirme a substituição da resposta atual antes de salvar a correção administrativa."));

        mockMvc.perform(put("/api/admin/invitations/{id}/rsvp", invitationId)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adminSubmission(
                                UUID.randomUUID(), true, "DECLINED", "CONFIRMED", "[]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitation.participants[0].status").value("DECLINED"))
                .andExpect(jsonPath("$.invitation.companions.length()").value(0));

        assertThat(count("wedding.rsvp_submission")).isEqualTo(2);
        assertThat(countWhere("wedding.companion", "removed_at IS NOT NULL")).isEqualTo(1);
        assertThat(jdbcClient.sql("SELECT DISTINCT origin FROM wedding.rsvp_change")
                        .query(String.class)
                        .list())
                .containsExactly("ADMIN");
    }

    @Test
    void unauthenticatedVisitorCannotUseAdministrativeRsvp() throws Exception {
        mockMvc.perform(get("/api/admin/invitations/{id}/rsvp", invitationId))
                .andExpect(status().isUnauthorized());
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

    private Cookie accessSession(String token, String origin) throws Exception {
        var result = mockMvc.perform(post("/api/rsvp/access")
                        .with(csrf())
                        .with(remoteOrigin(origin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + token + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("SESSION");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private String submission(
            UUID operationId,
            UUID firstId,
            String firstStatus,
            UUID secondId,
            String secondStatus) {
        return """
                {
                  "operationId": "%s",
                  "participants": [
                    {"participantId": "%s", "status": "%s"},
                    {"participantId": "%s", "status": "%s"}
                  ],
                  "companions": []
                }
                """.formatted(operationId, firstId, firstStatus, secondId, secondStatus);
    }

    private String submission(
            UUID operationId,
            UUID firstId,
            String firstStatus,
            UUID secondId,
            String secondStatus,
            String companions) {
        return submission(operationId, firstId, firstStatus, secondId, secondStatus)
                .replace("\"companions\": []", "\"companions\": " + companions);
    }

    private String companions(UUID firstId, String firstName, UUID secondId, String secondName) {
        return "[{\"id\":\"" + firstId + "\",\"name\":\"" + firstName + "\"},"
                + "{\"id\":\"" + secondId + "\",\"name\":\"" + secondName + "\"}]";
    }

    private String adminSubmission(
            UUID operationId,
            boolean replaceExisting,
            String firstStatus,
            String secondStatus,
            String companions) {
        return """
                {
                  "operationId": "%s",
                  "replaceExisting": %s,
                  "participants": [
                    {"participantId": "%s", "status": "%s"},
                    {"participantId": "%s", "status": "%s"}
                  ],
                  "companions": %s
                }
                """.formatted(
                operationId,
                replaceExisting,
                firstGuestId,
                firstStatus,
                secondGuestId,
                secondStatus,
                companions);
    }

    private long count(String table) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + table).query(Long.class).single();
    }

    private long countWhere(String table, String condition) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + table + " WHERE " + condition)
                .query(Long.class)
                .single();
    }

    private MockHttpSession rsvpSession(UUID accessCodeId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(RsvpAccessService.INVITATION_SESSION_ATTRIBUTE, invitationId.toString());
        session.setAttribute(RsvpAccessService.ACCESS_CODE_SESSION_ATTRIBUTE, accessCodeId.toString());
        return session;
    }

    private RsvpSubmissionRequest concurrentSubmission(String companionName) {
        return new RsvpSubmissionRequest(
                UUID.randomUUID(),
                java.util.List.of(
                        new RsvpParticipantRequest(firstGuestId, RsvpStatus.CONFIRMED),
                        new RsvpParticipantRequest(secondGuestId, RsvpStatus.DECLINED)),
                java.util.List.of(new RsvpCompanionRequest(UUID.randomUUID(), companionName)));
    }

    private RsvpSubmissionResponse submitAfterBarrier(
            RsvpSubmissionRequest request,
            MockHttpSession session,
            CountDownLatch ready,
            CountDownLatch start) throws InterruptedException {
        ready.countDown();
        start.await(5, TimeUnit.SECONDS);
        return responseService.submit(request, session);
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
