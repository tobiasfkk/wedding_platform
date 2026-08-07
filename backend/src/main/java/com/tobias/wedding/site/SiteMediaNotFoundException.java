package com.tobias.wedding.site;

public class SiteMediaNotFoundException extends RuntimeException {

    SiteMediaNotFoundException() {
        super("A imagem não foi encontrada.");
    }
}
