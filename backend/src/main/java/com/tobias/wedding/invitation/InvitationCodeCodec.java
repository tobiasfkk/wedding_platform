package com.tobias.wedding.invitation;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
class InvitationCodeCodec {

    private static final int TOKEN_BYTES = 32;
    private static final int TOKEN_LENGTH = 43;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final InvitationCodeProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    InvitationCodeCodec(InvitationCodeProperties properties) {
        this.properties = properties;
    }

    GeneratedCode generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return new GeneratedCode(
                token,
                digest(token, properties.pepper()),
                properties.pepperVersion());
    }

    List<CodeDigest> verificationDigests(String token) {
        if (!isWellFormed(token)) {
            return List.of();
        }
        return properties.verificationPeppers().stream()
                .map(pepper -> new CodeDigest(digest(token, pepper.value()), pepper.version()))
                .toList();
    }

    String publicLink(String token) {
        return properties.publicBaseUrl() + "/rsvp#code=" + token;
    }

    private boolean isWellFormed(String token) {
        if (token == null || token.length() != TOKEN_LENGTH) {
            return false;
        }
        for (int index = 0; index < token.length(); index++) {
            char character = token.charAt(index);
            boolean allowed = Character.isLetterOrDigit(character) || character == '-' || character == '_';
            if (!allowed) {
                return false;
            }
        }
        return true;
    }

    private String digest(String token, String pepper) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Invitation code hashing is unavailable", exception);
        }
    }

    record GeneratedCode(String token, String digest, int pepperVersion) {}

    record CodeDigest(String digest, int pepperVersion) {}
}
