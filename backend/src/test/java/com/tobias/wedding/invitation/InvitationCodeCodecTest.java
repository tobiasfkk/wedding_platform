package com.tobias.wedding.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class InvitationCodeCodecTest {

    private static final String PEPPER = "unit-test-pepper-with-at-least-32-characters";

    @Test
    void generatesUnpredictableUrlSafeTokensAndAuthenticatedDigests() {
        InvitationCodeCodec codec = new InvitationCodeCodec(properties());

        InvitationCodeCodec.GeneratedCode first = codec.generate();
        InvitationCodeCodec.GeneratedCode second = codec.generate();

        assertThat(first.token()).hasSize(43).matches("[A-Za-z0-9_-]{43}");
        assertThat(first.digest()).hasSize(64).matches("[0-9a-f]{64}").doesNotContain(first.token());
        assertThat(first.token()).isNotEqualTo(second.token());
        assertThat(first.digest()).isNotEqualTo(second.digest());
        assertThat(codec.verificationDigests(first.token()))
                .containsExactly(new InvitationCodeCodec.CodeDigest(first.digest(), 1));
        assertThat(codec.publicLink(first.token()))
                .isEqualTo("https://wedding.example/rsvp#code=" + first.token());
    }

    @Test
    void rejectsMalformedTokensAndUnsafeConfiguration() {
        InvitationCodeCodec codec = new InvitationCodeCodec(properties());

        assertThat(codec.verificationDigests("short-or-invalid-token")).isEmpty();
        assertThatThrownBy(() -> new InvitationCodeProperties(
                        "weak", 1, null, null, "https://wedding.example"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 32 characters");
    }

    private InvitationCodeProperties properties() {
        return new InvitationCodeProperties(PEPPER, 1, null, null, "https://wedding.example/");
    }
}
