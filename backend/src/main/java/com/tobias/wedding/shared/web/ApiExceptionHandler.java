package com.tobias.wedding.shared.web;

import com.tobias.wedding.auth.AuthenticationRejectedException;
import com.tobias.wedding.guest.GuestFilterException;
import com.tobias.wedding.guest.GuestNotFoundException;
import com.tobias.wedding.wedding.WeddingNotConfiguredException;
import com.tobias.wedding.wedding.WeddingSettingsValidationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final URI VALIDATION_TYPE = URI.create("urn:wedding:error:validation");
    private static final URI MALFORMED_REQUEST_TYPE = URI.create("urn:wedding:error:malformed-request");
    private static final URI INTERNAL_ERROR_TYPE = URI.create("urn:wedding:error:internal");
    private static final URI AUTHENTICATION_TYPE = URI.create("urn:wedding:error:authentication");
    private static final URI NOT_FOUND_TYPE = URI.create("urn:wedding:error:not-found");
    private static final URI CONFLICT_TYPE = URI.create("urn:wedding:error:conflict");

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        List<ApiFieldError> errors = exception.getBindingResult().getFieldErrors().stream()
                .sorted(Comparator.comparing(FieldError::getField))
                .map(error -> new ApiFieldError(error.getField(), error.getDefaultMessage()))
                .toList();

        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                VALIDATION_TYPE,
                "Dados inválidos",
                "Um ou mais campos são inválidos.",
                "VALIDATION_ERROR");
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException exception) {
        List<ApiFieldError> errors = exception.getConstraintViolations().stream()
                .map(violation -> new ApiFieldError(
                        violation.getPropertyPath().toString(), violation.getMessage()))
                .sorted(Comparator.comparing(ApiFieldError::field))
                .toList();

        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                VALIDATION_TYPE,
                "Dados inválidos",
                "Um ou mais parâmetros são inválidos.",
                "VALIDATION_ERROR");
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> handleMalformedRequest() {
        return ResponseEntity.badRequest().body(problem(
                HttpStatus.BAD_REQUEST,
                MALFORMED_REQUEST_TYPE,
                "Requisição inválida",
                "O corpo da requisição não pôde ser interpretado.",
                "MALFORMED_REQUEST"));
    }

    @ExceptionHandler(AuthenticationRejectedException.class)
    ResponseEntity<ProblemDetail> handleAuthenticationRejected(AuthenticationRejectedException exception) {
        HttpStatus status = exception.rateLimited() ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.UNAUTHORIZED;
        return ResponseEntity.status(status).body(problem(
                status,
                AUTHENTICATION_TYPE,
                "Autenticação não realizada",
                "Não foi possível autenticar com as credenciais informadas.",
                "AUTHENTICATION_FAILED"));
    }

    @ExceptionHandler(WeddingSettingsValidationException.class)
    ResponseEntity<ProblemDetail> handleWeddingSettingsValidation(WeddingSettingsValidationException exception) {
        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                VALIDATION_TYPE,
                "Dados inválidos",
                "Um ou mais campos são inválidos.",
                "VALIDATION_ERROR");
        problem.setProperty("errors", List.of(new ApiFieldError(exception.field(), exception.getMessage())));
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(GuestFilterException.class)
    ResponseEntity<ProblemDetail> handleGuestFilter(GuestFilterException exception) {
        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                VALIDATION_TYPE,
                "Filtro inválido",
                exception.getMessage(),
                "VALIDATION_ERROR");
        problem.setProperty("errors", List.of(new ApiFieldError("status", exception.getMessage())));
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(GuestNotFoundException.class)
    ResponseEntity<ProblemDetail> handleGuestNotFound(GuestNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem(
                HttpStatus.NOT_FOUND,
                NOT_FOUND_TYPE,
                "Convidado não encontrado",
                exception.getMessage(),
                "GUEST_NOT_FOUND"));
    }

    @ExceptionHandler(WeddingNotConfiguredException.class)
    ResponseEntity<ProblemDetail> handleWeddingNotConfigured(WeddingNotConfiguredException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem(
                HttpStatus.CONFLICT,
                CONFLICT_TYPE,
                "Casamento não configurado",
                exception.getMessage(),
                "WEDDING_NOT_CONFIGURED"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        LOGGER.error("Unexpected error while processing {} {}", request.getMethod(), request.getRequestURI(), exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                INTERNAL_ERROR_TYPE,
                "Erro interno",
                "Ocorreu um erro interno inesperado.",
                "INTERNAL_ERROR"));
    }

    private ProblemDetail problem(
            HttpStatus status,
            URI type,
            String title,
            String detail,
            String code) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(type);
        problem.setTitle(title);
        problem.setProperty("code", code);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
