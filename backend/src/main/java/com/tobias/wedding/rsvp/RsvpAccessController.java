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

    private final RsvpAccessService accessService;
    private final RsvpResponseService responseService;

    RsvpAccessController(RsvpAccessService accessService, RsvpResponseService responseService) {
        this.accessService = accessService;
        this.responseService = responseService;
    }

    @GetMapping("/session")
    RsvpSessionResponse session(HttpSession session, CsrfToken csrfToken) {
        return accessService.current(session)
                .map(access -> new RsvpSessionResponse(true, responseService.view(access), csrfToken.getToken()))
                .orElseGet(() -> new RsvpSessionResponse(false, null, csrfToken.getToken()));
    }

    @PostMapping("/access")
    RsvpInvitationResponse access(
            @Valid @RequestBody RsvpAccessRequest access,
            HttpServletRequest request) {
        return responseService.view(accessService.exchange(access.code(), request));
    }

    @PostMapping("/responses")
    RsvpSubmissionResponse respond(
            @Valid @RequestBody RsvpSubmissionRequest response,
            HttpSession session) {
        return responseService.submit(response, session);
    }
}
