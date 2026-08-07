package com.tobias.wedding.site;

public class WeddingSiteNotPublishedException extends RuntimeException {

    WeddingSiteNotPublishedException() {
        super("O site do casamento ainda não está publicado.");
    }
}
