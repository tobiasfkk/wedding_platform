package com.tobias.wedding.site;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/site")
class WeddingSiteAdminController {

    private final WeddingSiteService service;

    WeddingSiteAdminController(WeddingSiteService service) {
        this.service = service;
    }

    @GetMapping
    WeddingSiteAdminResponse findDraft() {
        return service.findDraft();
    }

    @PutMapping("/draft")
    WeddingSiteAdminResponse saveDraft(@Valid @RequestBody WeddingSiteDraftRequest request) {
        return service.saveDraft(request);
    }

    @PutMapping("/publication")
    WeddingSiteAdminResponse publish() {
        return service.publish();
    }

    @DeleteMapping("/publication")
    WeddingSiteAdminResponse unpublish() {
        return service.unpublish();
    }
}
