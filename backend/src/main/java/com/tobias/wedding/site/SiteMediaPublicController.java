package com.tobias.wedding.site;

import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/site/media")
class SiteMediaPublicController {

    private final SiteMediaService service;

    SiteMediaPublicController(SiteMediaService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    ResponseEntity<org.springframework.core.io.Resource> find(@PathVariable UUID id) {
        SiteMediaService.SiteMediaDownload media = service.findPublished(id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(MediaType.parseMediaType(media.contentType()))
                .body(media.resource());
    }
}
