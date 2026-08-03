package com.tobias.wedding.guest;

import java.util.UUID;

public record GuestSummary(UUID id, String name, boolean active) {}
