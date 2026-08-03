package com.tobias.wedding.invitation;

import java.util.List;

record InvitationPageResponse(
        List<InvitationResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {}
