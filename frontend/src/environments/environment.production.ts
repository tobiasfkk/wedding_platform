// Produção: a API fica em um subdomínio do mesmo site (mesmo domínio registrável do frontend),
// portanto os cookies de sessão SameSite=Lax continuam sendo enviados com credenciais.
export const environment = {
  apiBaseUrl: 'https://api.casamentodudatobi.tobiaskiefer.com.br',
};
