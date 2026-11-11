/* Configuração do Power-Up "PMO BigBox – Interdependência" (piloto: SÓ quadros de teste).
 * Nada aqui é segredo: a chave de API do Trello é pública (o segredo é o token, que fica só no servidor).
 *  - API_URL: endereço "/exec" do App da Web do Apps Script (apps_script/Interdep.gs).
 *  - APP_KEY: chave de API do Power-Up (admin do Trello). Tem de ser a mesma da propriedade APP_KEY do servidor.
 * Enquanto estiverem vazios o Power-Up mostra "ainda não configurado" e não chama nada. */
window.PMO_INTERDEP = {
  API_URL: "https://script.google.com/macros/s/AKfycbw0--rEpAVoqgIfXoBs8ZGt_AsMyt69YKF3xCnqZ2lBFFZo2yWmkw4Wqith_Jx-yPer/exec",
  APP_KEY: "9233eafb60c6769f1ad5cdf2da2123b5",
  APP_NAME: "PMO BigBox – Interdependência",
  // key = shortLink do quadro (trello.com/b/<shortLink>/...). Mantenha igual ao AREAS do servidor.
  AREAS: [
    { key: "7uckGfR4", nome: "Comercial (teste)" },
    { key: "b4kXgCbn", nome: "Processos (teste)" },
    { key: "wlj9Xouh", nome: "Auditoria (teste)" },
  ],
};
