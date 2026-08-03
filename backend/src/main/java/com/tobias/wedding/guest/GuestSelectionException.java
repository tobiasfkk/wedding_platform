package com.tobias.wedding.guest;

public class GuestSelectionException extends RuntimeException {

    GuestSelectionException() {
        super("Um ou mais convidados não estão ativos ou não pertencem ao casamento atual.");
    }
}
