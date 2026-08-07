package com.tobias.wedding.site;

import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/site/media")
class SiteMediaAdminController {

    private final SiteMediaService service;

    SiteMediaAdminController(SiteMediaService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    SiteMediaUploadResponse upload(@RequestPart("file") MultipartFile file) {
        return service.upload(file);
    }

    @GetMapping("/{id}")
    ResponseEntity<org.springframework.core.io.Resource> find(@PathVariable UUID id) {
        SiteMediaService.SiteMediaDownload media = service.findForCurrentWedding(id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(MediaType.parseMediaType(media.contentType()))
                .body(media.resource());
    }
}
