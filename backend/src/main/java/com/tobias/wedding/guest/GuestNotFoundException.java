package com.tobias.wedding.guest;

public class GuestNotFoundException extends RuntimeException {

    GuestNotFoundException() {
        super("Convidado não encontrado.");
    }
}
