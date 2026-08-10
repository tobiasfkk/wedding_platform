package com.tobias.wedding.site;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

final class GoogleMapsUrlPolicy {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "google.com",
            "www.google.com",
            "maps.google.com",
            "google.com.br",
            "www.google.com.br",
            "maps.google.com.br",
            "maps.app.goo.gl",
            "goo.gl");

    private GoogleMapsUrlPolicy() {}

    static boolean allows(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && host != null
                    && ALLOWED_HOSTS.contains(host.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
