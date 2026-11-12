# Imagem de execução do backend. O JAR é gerado fora da imagem (./mvnw package), então o build do
# Docker é rápido e multi-arquitetura (a EC2 t4g usa arm64).
#
#   cd backend && ./mvnw --batch-mode -DskipTests package
#   docker build --build-arg JAR_FILE=target/wedding-backend-0.0.1-SNAPSHOT.jar -t wedding-backend .
FROM eclipse-temurin:21-jre-alpine

ARG JAR_FILE=target/wedding-backend-0.0.1-SNAPSHOT.jar

RUN addgroup -S wedding && adduser -S -G wedding -H -s /sbin/nologin wedding

WORKDIR /app
COPY --chown=wedding:wedding ${JAR_FILE} /app/app.jar

USER wedding

ENV SPRING_PROFILES_ACTIVE=production \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError -Xss512k"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
