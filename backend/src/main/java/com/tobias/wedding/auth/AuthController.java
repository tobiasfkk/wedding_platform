package com.tobias.wedding.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    private final AuthenticationManager authenticationManager;
    private final LoginAttemptService attempts;
    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    AuthController(AuthenticationManager authenticationManager, LoginAttemptService attempts) {
        this.authenticationManager = authenticationManager;
        this.attempts = attempts;
    }

    @GetMapping("/session")
    SessionResponse session(Principal principal, CsrfToken csrfToken) {
        csrfToken.getToken();
        return principal == null
                ? new SessionResponse(false, null, csrfToken.getToken())
                : new SessionResponse(true, principal.getName(), csrfToken.getToken());
    }

    @PostMapping("/login")
    ResponseEntity<SessionResponse> login(
            @Valid @RequestBody LoginRequest login,
            HttpServletRequest request,
            HttpServletResponse response) {
        String email = Administrator.normalizeEmail(login.email());
        String origin = request.getRemoteAddr();
        if (attempts.isBlocked(email, origin)) {
            throw new AuthenticationRejectedException(true);
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, login.password()));
            attempts.clear(email, origin);

            if (request.getSession(false) != null) {
                request.changeSessionId();
            }
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);

            return ResponseEntity.ok(new SessionResponse(true, authentication.getName(), null));
        } catch (AuthenticationException exception) {
            attempts.recordFailure(email, origin);
            throw new AuthenticationRejectedException(false);
        }
    }

    record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 128) String password) {}

    record SessionResponse(boolean authenticated, String email, String csrfToken) {}
}
