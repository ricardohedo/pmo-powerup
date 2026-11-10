/* Cliente do servidor (Apps Script). O navegador NÃO escreve no Trello: leva o token de leitura do próprio
 * usuário para o servidor confirmar quem é e se é membro do quadro.
 * POST como texto simples (JSON em string) para não gerar preflight de CORS, que o Apps Script não responde. */
window.InterdepApi = (function () {
  var cfg = window.PMO_INTERDEP || {};

  function erro(msg, codigo) { var e = new Error(msg); e.codigo = codigo; return e; }
  function configurado() { return !!(cfg.API_URL && cfg.APP_KEY); }

  // Escopo "read": o servidor só usa o token para saber quem é a pessoa. Precisa de clique do usuário.
  function autorizar(t) { return t.getRestApi().authorize({ scope: "read", expiration: "30days" }); }

  async function chamar(t, corpo) {
    if (!configurado()) throw erro("Power-Up ainda não configurado.", "sem_config");
    var api = t.getRestApi();
    if (!(await api.isAuthorized())) throw erro("É preciso autorizar o Power-Up.", "sem_autorizacao");
    var token = await api.getToken();
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 30000);
    var r;
    try {
      r = await fetch(cfg.API_URL, { method: "POST", body: JSON.stringify(Object.assign({}, corpo, { token: token })), signal: ctrl.signal });
    } catch (e) {
      throw erro("Não consegui falar com o servidor. Tente de novo em instantes.", "rede");
    } finally { clearTimeout(timer); }
    var j = await r.json().catch(function () { return null; });
    if (!j || !j.ok) {
      var cod = (j && j.codigo) || r.status;
      throw erro((j && j.erro) || "O servidor não respondeu direito.", cod === 401 ? "sem_autorizacao" : cod);
    }
    return j;
  }

  return {
    configurado: configurado, autorizar: autorizar,
    status: function (t, cardId) { return chamar(t, { acao: "status", cardId: cardId }); },
    pedir: function (t, dados) { return chamar(t, Object.assign({ acao: "pedir" }, dados)); },
    cancelar: function (t, filhoId) { return chamar(t, { acao: "cancelar", filhoId: filhoId }); },
  };
})();
