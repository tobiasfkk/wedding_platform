package com.tobias.wedding.guest;

import java.util.List;
import org.springframework.data.domain.Page;

record GuestPageResponse(
        List<GuestResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    static GuestPageResponse from(Page<Guest> guests) {
        return new GuestPageResponse(
                guests.getContent().stream().map(GuestResponse::from).toList(),
                guests.getNumber(),
                guests.getSize(),
                guests.getTotalElements(),
                guests.getTotalPages());
    }
}
