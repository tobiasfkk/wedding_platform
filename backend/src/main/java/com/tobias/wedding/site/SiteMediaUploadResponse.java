package com.tobias.wedding.site;

import java.util.UUID;

record SiteMediaUploadResponse(
        UUID id, String url, String contentType, int width, int height, long sizeBytes) {}
