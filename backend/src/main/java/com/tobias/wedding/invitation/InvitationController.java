package com.tobias.wedding.invitation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/invitations")
class InvitationController {

    private static final Logger LOGGER = LoggerFactory.getLogger(InvitationController.class);

    private final InvitationService service;

    InvitationController(InvitationService service) {
        this.service = service;
    }

    @GetMapping
    InvitationPageResponse findAll(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.findAll(query, status, page, size);
    }

    @GetMapping("/eligible-guests")
    List<EligibleGuestResponse> findEligibleGuests(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(required = false) UUID invitationId) {
        return service.findEligibleGuests(query, invitationId);
    }

    @PostMapping
    ResponseEntity<InvitationResponse> create(@Valid @RequestBody InvitationRequest request) {
        InvitationResponse response = service.create(request);
        LOGGER.info("Invitation created with id {}", response.id());
        return ResponseEntity.created(URI.create("/api/admin/invitations/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    InvitationResponse update(@PathVariable UUID id, @Valid @RequestBody InvitationRequest request) {
        InvitationResponse response = service.update(id, request);
        LOGGER.info("Invitation updated with id {}", id);
        return response;
    }

    @PostMapping("/{id}/activate")
    InvitationLinkResponse activate(@PathVariable UUID id, Principal principal) {
        InvitationLinkResponse response = service.activate(id, principal.getName());
        LOGGER.info("Invitation activated with id {}", id);
        return response;
    }

    @PostMapping("/{id}/regenerate-link")
    InvitationLinkResponse regenerateLink(@PathVariable UUID id, Principal principal) {
        InvitationLinkResponse response = service.regenerateLink(id, principal.getName());
        LOGGER.info("Invitation link regenerated for id {}", id);
        return response;
    }

    @PostMapping("/{id}/inactivate")
    InvitationResponse inactivate(@PathVariable UUID id, Principal principal) {
        InvitationResponse response = service.inactivate(id, principal.getName());
        LOGGER.info("Invitation inactivated with id {}", id);
        return response;
    }
}
