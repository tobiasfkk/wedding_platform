package com.tobias.wedding.invitation;

import java.net.URI;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("wedding.invitation-code")
public record InvitationCodeProperties(
        String pepper,
        int pepperVersion,
        String previousPepper,
        Integer previousPepperVersion,
        String publicBaseUrl) {

    public InvitationCodeProperties {
        requireStrongPepper(pepper, "pepper");
        if (pepperVersion < 1) {
            throw new IllegalArgumentException("The invitation-code pepper version must be positive");
        }
        boolean hasPreviousPepper = previousPepper != null && !previousPepper.isBlank();
        boolean hasPreviousVersion = previousPepperVersion != null;
        if (hasPreviousPepper != hasPreviousVersion) {
            throw new IllegalArgumentException("Previous invitation-code pepper and version must be configured together");
        }
        if (hasPreviousPepper) {
            requireStrongPepper(previousPepper, "previous-pepper");
            if (previousPepperVersion < 1 || previousPepperVersion == pepperVersion) {
                throw new IllegalArgumentException("The previous invitation-code pepper version must be distinct");
            }
        }
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            throw new IllegalArgumentException("The invitation-code public base URL is required");
        }
        URI baseUri = URI.create(publicBaseUrl);
        if (!("http".equalsIgnoreCase(baseUri.getScheme()) || "https".equalsIgnoreCase(baseUri.getScheme()))) {
            throw new IllegalArgumentException("The invitation-code public base URL must use HTTP or HTTPS");
        }
        publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
    }

    List<Pepper> verificationPeppers() {
        if (previousPepper == null || previousPepper.isBlank()) {
            return List.of(new Pepper(pepperVersion, pepper));
        }
        return List.of(
                new Pepper(pepperVersion, pepper),
                new Pepper(previousPepperVersion, previousPepper));
    }

    private static void requireStrongPepper(String value, String property) {
        if (value == null || value.length() < 32) {
            throw new IllegalArgumentException("The invitation-code " + property + " must have at least 32 characters");
        }
    }

    record Pepper(int version, String value) {}
}
