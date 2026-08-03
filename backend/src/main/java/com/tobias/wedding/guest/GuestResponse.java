package com.tobias.wedding.guest;

import java.util.UUID;

record GuestResponse(UUID id, String name, String contact, boolean active, long version) {

    static GuestResponse from(Guest guest) {
        return new GuestResponse(
                guest.id(), guest.name(), guest.contact(), guest.active(), guest.version());
    }
}
