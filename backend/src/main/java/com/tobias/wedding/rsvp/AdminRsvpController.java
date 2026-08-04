package com.tobias.wedding.rsvp;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/invitations/{invitationId}/rsvp")
class AdminRsvpController {

    private final RsvpResponseService service;

    AdminRsvpController(RsvpResponseService service) {
        this.service = service;
    }

    @GetMapping
    AdminRsvpResponse find(@PathVariable UUID invitationId) {
        return service.adminView(invitationId);
    }

    @PutMapping
    AdminRsvpResponse save(
            @PathVariable UUID invitationId,
            @Valid @RequestBody AdminRsvpRequest request,
            Principal principal) {
        return service.submitAdmin(invitationId, request, principal.getName());
    }
}
