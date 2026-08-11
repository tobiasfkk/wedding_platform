package com.tobias.wedding.wedding;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/rsvp/deadline")
class RsvpDeadlineController {

    private final RsvpDeadlineService service;

    RsvpDeadlineController(RsvpDeadlineService service) {
        this.service = service;
    }

    @GetMapping
    RsvpDeadlineResponse find() {
        return service.findCurrent();
    }

    @PutMapping
    RsvpDeadlineResponse save(@Valid @RequestBody RsvpDeadlineRequest request) {
        return service.save(request);
    }
}
