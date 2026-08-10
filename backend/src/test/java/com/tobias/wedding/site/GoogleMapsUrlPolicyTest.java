package com.tobias.wedding.site;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GoogleMapsUrlPolicyTest {

    @Test
    void acceptsKnownHttpsGoogleMapsLinks() {
        assertThat(GoogleMapsUrlPolicy.allows("https://www.google.com/maps/place/Espaco+Jardim")).isTrue();
        assertThat(GoogleMapsUrlPolicy.allows("https://maps.google.com.br/?q=Espaco+Jardim")).isTrue();
        assertThat(GoogleMapsUrlPolicy.allows("https://maps.app.goo.gl/example")).isTrue();
    }

    @Test
    void rejectsUnsafeMalformedAndUnrelatedLinks() {
        assertThat(GoogleMapsUrlPolicy.allows("javascript:alert(1)")).isFalse();
        assertThat(GoogleMapsUrlPolicy.allows("http://www.google.com/maps/place/example")).isFalse();
        assertThat(GoogleMapsUrlPolicy.allows("https://example.com/maps/place/example")).isFalse();
        assertThat(GoogleMapsUrlPolicy.allows("not a url")).isFalse();
    }
}
