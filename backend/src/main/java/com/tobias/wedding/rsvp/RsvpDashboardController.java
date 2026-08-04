package com.tobias.wedding.rsvp;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/rsvp/dashboard")
class RsvpDashboardController {

    private final RsvpDashboardService service;

    RsvpDashboardController(RsvpDashboardService service) {
        this.service = service;
    }

    @GetMapping
    RsvpDashboardResponse find(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.find(query, status, page, size);
    }
}
