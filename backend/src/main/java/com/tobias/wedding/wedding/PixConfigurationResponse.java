package com.tobias.wedding.wedding;

public record PixConfigurationResponse(
        boolean configured, String key, String payload, String recipientName) {

    static PixConfigurationResponse empty() {
        return new PixConfigurationResponse(false, null, null, null);
    }
}
