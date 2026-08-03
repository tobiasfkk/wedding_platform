package com.tobias.wedding.guest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/guests")
class GuestController {

    private static final Logger LOGGER = LoggerFactory.getLogger(GuestController.class);

    private final GuestService service;

    GuestController(GuestService service) {
        this.service = service;
    }

    @GetMapping
    GuestPageResponse findAll(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.findAll(query, status, page, size);
    }

    @PostMapping
    ResponseEntity<GuestResponse> create(@Valid @RequestBody GuestRequest request) {
        GuestResponse response = service.create(request);
        LOGGER.info("Guest created with id {}", response.id());
        return ResponseEntity.created(URI.create("/api/admin/guests/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    GuestResponse update(@PathVariable UUID id, @Valid @RequestBody GuestRequest request) {
        GuestResponse response = service.update(id, request);
        LOGGER.info("Guest updated with id {}", id);
        return response;
    }

    @PatchMapping("/{id}/status")
    GuestResponse changeStatus(@PathVariable UUID id, @Valid @RequestBody GuestStatusRequest request) {
        GuestResponse response = service.changeStatus(id, request.active());
        LOGGER.info("Guest status changed with id {} to active={}", id, request.active());
        return response;
    }
}
