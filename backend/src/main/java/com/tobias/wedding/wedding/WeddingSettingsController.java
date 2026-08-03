package com.tobias.wedding.wedding;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/wedding")
class WeddingSettingsController {

    private static final Logger LOGGER = LoggerFactory.getLogger(WeddingSettingsController.class);

    private final WeddingSettingsService service;

    WeddingSettingsController(WeddingSettingsService service) {
        this.service = service;
    }

    @GetMapping
    WeddingSettingsResponse findCurrent() {
        return service.findCurrent();
    }

    @PutMapping
    WeddingSettingsResponse save(@Valid @RequestBody WeddingSettingsRequest request) {
        WeddingSettingsResponse response = service.save(request);
        LOGGER.info("Wedding settings updated at version {}", response.version());
        return response;
    }
}
