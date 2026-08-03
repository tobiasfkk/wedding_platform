package com.tobias.wedding.rsvp;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RsvpChangeRepository extends JpaRepository<RsvpChange, UUID> {}
