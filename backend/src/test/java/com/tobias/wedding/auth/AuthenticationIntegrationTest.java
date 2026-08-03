package com.tobias.wedding.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties = {
    "wedding.auth.initial-admin.email=admin@example.com",
    "wedding.auth.initial-admin.password=Local-password-123!",
    "wedding.auth.login-attempts.maximum=3"
})
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class AuthenticationIntegrationTest {

    private static final Pattern CSRF_TOKEN_PATTERN =
            Pattern.compile("\\\"csrfToken\\\":\\\"([^\\\"]+)\\\"");

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void authenticatesAccessesProtectedResourceAndInvalidatesTheSessionOnLogout() throws Exception {
        AnonymousSession anonymous = anonymousSession();

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .cookie(anonymous.cookie())
                        .header("X-XSRF-TOKEN", anonymous.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"ADMIN@example.com","password":"Local-password-123!"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.email").value("admin@example.com"))
                .andReturn();

        Cookie authenticatedCookie = requiredSessionCookie(login, anonymous.cookie());
        mockMvc.perform(get("/api/admin/me").cookie(authenticatedCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@example.com"));

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(authenticatedCookie)
                        .header("X-XSRF-TOKEN", anonymous.csrfToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/me").cookie(authenticatedCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidCredentialsWithTheSameGenericContract() throws Exception {
        AnonymousSession anonymous = anonymousSession();

        mockMvc.perform(post("/api/auth/login")
                        .cookie(anonymous.cookie())
                        .header("X-XSRF-TOKEN", anonymous.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"unknown@example.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"))
                .andExpect(jsonPath("$.detail")
                        .value("Não foi possível autenticar com as credenciais informadas."));

        mockMvc.perform(get("/api/admin/me").cookie(anonymous.cookie()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void storesOnlyAnArgon2HashForTheInitialPassword() {
        String hash = jdbcClient.sql("SELECT password_hash FROM wedding.administrator WHERE email = :email")
                .param("email", "admin@example.com")
                .query(String.class)
                .single();

        assertThat(hash).startsWith("$argon2id$");
        assertThat(hash).doesNotContain("Local-password-123!");
    }

    @Test
    void limitsRepeatedFailuresWithoutRevealingWhetherTheAccountExists() throws Exception {
        AnonymousSession anonymous = anonymousSession();
        for (int attempt = 0; attempt < 3; attempt++) {
            mockMvc.perform(post("/api/auth/login")
                            .with(request -> {
                                request.setRemoteAddr("192.0.2.10");
                                return request;
                            })
                            .cookie(anonymous.cookie())
                            .header("X-XSRF-TOKEN", anonymous.csrfToken())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email":"blocked@example.com","password":"wrong-password"}
                                    """))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
        }

        mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr("192.0.2.10");
                            return request;
                        })
                        .cookie(anonymous.cookie())
                        .header("X-XSRF-TOKEN", anonymous.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"blocked@example.com","password":"wrong-password"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"))
                .andExpect(jsonPath("$.detail")
                        .value("Não foi possível autenticar com as credenciais informadas."));
    }

    private AnonymousSession anonymousSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false))
                .andReturn();
        Matcher matcher = CSRF_TOKEN_PATTERN.matcher(result.getResponse().getContentAsString());
        assertThat(matcher.find()).isTrue();
        return new AnonymousSession(requiredSessionCookie(result, null), matcher.group(1));
    }

    private Cookie requiredSessionCookie(MvcResult result, Cookie fallback) {
        Cookie cookie = result.getResponse().getCookie("SESSION");
        return cookie == null ? fallback : cookie;
    }

    private record AnonymousSession(Cookie cookie, String csrfToken) {}
}
