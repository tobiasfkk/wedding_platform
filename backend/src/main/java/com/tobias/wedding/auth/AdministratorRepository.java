package com.tobias.wedding.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AdministratorRepository extends JpaRepository<Administrator, UUID> {

    Optional<Administrator> findByEmail(String email);

    boolean existsByEmail(String email);
}
