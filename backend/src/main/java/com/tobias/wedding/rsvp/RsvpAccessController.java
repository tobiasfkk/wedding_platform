package com.tobias.wedding.rsvp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rsvp")
class RsvpAccessController {

    private final RsvpAccessService service;

    RsvpAccessController(RsvpAccessService service) {
        this.service = service;
    }

    @GetMapping("/session")
    RsvpSessionResponse session(HttpSession session, CsrfToken csrfToken) {
        return service.current(session)
                .map(access -> new RsvpSessionResponse(true, RsvpInvitationResponse.from(access), csrfToken.getToken()))
                .orElseGet(() -> new RsvpSessionResponse(false, null, csrfToken.getToken()));
    }

    @PostMapping("/access")
    RsvpInvitationResponse access(
            @Valid @RequestBody RsvpAccessRequest access,
            HttpServletRequest request) {
        return RsvpInvitationResponse.from(service.exchange(access.code(), request));
    }
}
