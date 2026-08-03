package com.tobias.wedding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers(disabledWithoutDocker = true)
class FlywayMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.4-alpine3.24");

    @Test
    void createsTheApplicationSchemaFromAnEmptyDatabase() throws Exception {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .cleanDisabled(true)
                .validateOnMigrate(true)
                .load();

        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(6);

        try (Connection connection = POSTGRES.createConnection("");
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(
                        "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'wedding')")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getBoolean(1)).isTrue();
        }

        try (Connection connection = POSTGRES.createConnection("");
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables "
                                + "WHERE table_schema = 'wedding' "
                                + "AND table_name IN ('administrator', 'spring_session', "
                                + "'spring_session_attributes', 'wedding_event', 'guest', "
                                + "'invitation', 'invitation_guest', 'invitation_access_code')")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getInt(1)).isEqualTo(8);
        }
    }

    @Test
    void reportsTheInvalidMigrationThatPreventedStartup() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema("invalid_migration_test")
                .schemas("invalid_migration_test")
                .createSchemas(true)
                .locations("classpath:db/invalid-migration")
                .load();

        assertThatThrownBy(flyway::migrate)
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("V1__invalid_migration.sql");
    }
}
