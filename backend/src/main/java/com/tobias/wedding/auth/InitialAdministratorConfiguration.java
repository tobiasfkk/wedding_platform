package com.tobias.wedding.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
class InitialAdministratorConfiguration implements ApplicationRunner {

    private final ObjectProvider<AdministratorRepository> administrators;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    InitialAdministratorConfiguration(
            ObjectProvider<AdministratorRepository> administrators,
            PasswordEncoder passwordEncoder,
            @Value("${wedding.auth.initial-admin.email:}") String email,
            @Value("${wedding.auth.initial-admin.password:}") String password) {
        this.administrators = administrators;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        AdministratorRepository repository = administrators.getIfAvailable();
        if (repository == null) {
            return;
        }
        boolean hasEmail = StringUtils.hasText(email);
        boolean hasPassword = StringUtils.hasText(password);
        if (!hasEmail && !hasPassword) {
            return;
        }
        if (!hasEmail || !hasPassword) {
            throw new IllegalStateException(
                    "ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD must be configured together");
        }
        if (password.length() < 12) {
            throw new IllegalStateException("ADMIN_INITIAL_PASSWORD must contain at least 12 characters");
        }

        String normalizedEmail = Administrator.normalizeEmail(email);
        if (!repository.existsByEmail(normalizedEmail)) {
            repository.save(Administrator.create(normalizedEmail, passwordEncoder.encode(password)));
        }
    }
}
