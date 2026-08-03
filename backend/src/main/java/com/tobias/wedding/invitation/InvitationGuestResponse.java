package com.tobias.wedding.invitation;

import java.util.UUID;

record InvitationGuestResponse(UUID id, String name, boolean active) {}
