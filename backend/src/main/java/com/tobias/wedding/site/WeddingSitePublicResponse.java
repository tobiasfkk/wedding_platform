package com.tobias.wedding.site;

import java.time.Instant;

record WeddingSitePublicResponse(WeddingSiteContent content, long version, Instant publishedAt) {}
