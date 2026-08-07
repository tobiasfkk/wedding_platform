package com.tobias.wedding.site;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.core.io.Resource;

interface SiteMediaStorage {

    void store(String key, InputStream content) throws IOException;

    Resource load(String key);

    void delete(String key);
}
