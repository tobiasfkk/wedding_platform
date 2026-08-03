package com.tobias.wedding.shared.web;

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
