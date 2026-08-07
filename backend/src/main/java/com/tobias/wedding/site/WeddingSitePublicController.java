package com.tobias.wedding.site;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/site")
class WeddingSitePublicController {

    private final WeddingSiteService service;

    WeddingSitePublicController(WeddingSiteService service) {
        this.service = service;
    }

    @GetMapping
    WeddingSitePublicResponse findPublished() {
        return service.findPublished();
    }
}
