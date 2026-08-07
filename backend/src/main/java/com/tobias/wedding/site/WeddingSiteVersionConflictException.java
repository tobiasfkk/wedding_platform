package com.tobias.wedding.site;

public class WeddingSiteVersionConflictException extends RuntimeException {

    WeddingSiteVersionConflictException() {
        super("O rascunho foi alterado em outra sessão. Recarregue a página antes de salvar novamente.");
    }
}
