package com.tobias.wedding.wedding;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class PixConfigurationController {

    private final PixConfigurationService service;

    PixConfigurationController(PixConfigurationService service) {
        this.service = service;
    }

    @GetMapping("/public/pix")
    PixConfigurationResponse findPublic() {
        return service.findCurrent();
    }

    @GetMapping("/admin/pix")
    PixConfigurationResponse findAdmin() {
        return service.findCurrent();
    }

    @PutMapping("/admin/pix")
    PixConfigurationResponse save(@Valid @RequestBody PixConfigurationRequest request) {
        return service.save(request);
    }
}
