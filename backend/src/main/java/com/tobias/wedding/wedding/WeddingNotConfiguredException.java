package com.tobias.wedding.wedding;

public class WeddingNotConfiguredException extends RuntimeException {

    WeddingNotConfiguredException() {
        super("Configure o casamento antes de cadastrar convidados.");
    }
}
