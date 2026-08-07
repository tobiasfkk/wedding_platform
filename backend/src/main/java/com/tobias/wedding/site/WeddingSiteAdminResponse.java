package com.tobias.wedding.site;

import java.time.Instant;

record WeddingSiteAdminResponse(
        WeddingSiteContent draft,
        long draftVersion,
        boolean published,
        Long publishedVersion,
        Instant publishedAt,
        boolean hasUnpublishedChanges) {}
