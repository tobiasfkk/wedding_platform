package com.tobias.wedding.wedding;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
class PixConfigurationService {

    private final ObjectProvider<WeddingEventRepository> repositories;

    PixConfigurationService(ObjectProvider<WeddingEventRepository> repositories) {
        this.repositories = repositories;
    }

    @Transactional(readOnly = true)
    PixConfigurationResponse findCurrent() {
        return repository().findFirstByOrderByCreatedAtAsc()
                .map(this::response)
                .orElseGet(PixConfigurationResponse::empty);
    }

    @Transactional
    PixConfigurationResponse save(PixConfigurationRequest request) {
        String payload = request.payload().strip();
        validatePayload(payload);
        WeddingEvent event = repository().findFirstByOrderByCreatedAtAsc()
                .orElseGet(WeddingEvent::installationContext);
        event.updatePixConfiguration(normalizeOptional(request.key()), payload, request.recipientName().strip());
        return response(repository().saveAndFlush(event));
    }

    private void validatePayload(String payload) {
        String normalized = payload.toLowerCase(Locale.ROOT);
        if (!payload.startsWith("000201") || !normalized.contains("br.gov.bcb.pix")) {
            throw new PixConfigurationValidationException(
                    "Informe um código Pix Copia e Cola válido, no padrão BR Code.");
        }
        if (payload.length() < 8 || !payload.substring(payload.length() - 8, payload.length() - 4).equals("6304")) {
            throw new PixConfigurationValidationException("O código Pix informado não contém um CRC válido.");
        }
        String expected = payload.substring(payload.length() - 4).toUpperCase(Locale.ROOT);
        String calculated = "%04X".formatted(crc16(payload.substring(0, payload.length() - 4)));
        if (!expected.equals(calculated)) {
            throw new PixConfigurationValidationException("O código Pix informado possui um CRC inválido.");
        }
    }

    private int crc16(String value) {
        int result = 0xFFFF;
        for (byte current : value.getBytes(StandardCharsets.UTF_8)) {
            result ^= (current & 0xFF) << 8;
            for (int bit = 0; bit < 8; bit++) {
                result = (result & 0x8000) != 0 ? (result << 1) ^ 0x1021 : result << 1;
                result &= 0xFFFF;
            }
        }
        return result;
    }

    private String normalizeOptional(String value) {
        return StringUtils.hasText(value) ? value.strip() : null;
    }

    private WeddingEventRepository repository() {
        return repositories.getObject();
    }

    private PixConfigurationResponse response(WeddingEvent event) {
        if (!StringUtils.hasText(event.pixPayload())) return PixConfigurationResponse.empty();
        return new PixConfigurationResponse(
                true, event.pixKey(), event.pixPayload(), event.pixRecipientName());
    }
}
