package com.tobias.wedding.site;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;

@Component
class LocalSiteMediaStorage implements SiteMediaStorage {

    private final Path root;

    LocalSiteMediaStorage(@Value("${wedding.media.local-directory:.local-data/media}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public void store(String key, InputStream content) throws IOException {
        Path target = resolve(key);
        Path parent = target.getParent();
        if (parent == null) {
            throw new IOException("Não foi possível determinar o diretório da mídia.");
        }
        Files.createDirectories(parent);
        Files.copy(content, target);
    }

    @Override
    public Resource load(String key) {
        try {
            Resource resource = new UrlResource(resolve(key).toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new SiteMediaNotFoundException();
            }
            return resource;
        } catch (IOException exception) {
            throw new SiteMediaNotFoundException();
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ignored) {
            // A falha de compensação não deve esconder o erro original do upload.
        }
    }

    private Path resolve(String key) throws IOException {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IOException("Chave de mídia inválida.");
        }
        return resolved;
    }
}
