/**
 * PMO BigBox — Interdependência entre áreas (servidor).
 * Google Apps Script publicado como "App da Web" (Executar como: eu · Quem tem acesso: qualquer pessoa).
 *
 * Por que existe um servidor: cada área tem o seu quadro e NÃO deve ver o quadro das outras.
 * Quem lê e escreve nos quadros é a conta do PMO (token guardado aqui). O usuário só prova quem é
 * (token de leitura gerado pelo Power-Up) e o servidor confere se ele é membro do quadro do card.
 * Ninguém precisa entrar na Área de Trabalho do Trello.
 *
 * Propriedades do script (Configurações do projeto > Propriedades do script):
 *   TRELLO_KEY   chave de API da conta PMO
 *   TRELLO_TOKEN token da conta PMO (precisa ser membro de todos os quadros em AREAS)
 *   APP_KEY      chave de API do Power-Up (a mesma do interdep/config.js)
 *
 * Gatilho: rode instalarGatilho() uma vez. A cada 15 min ele atualiza o checklist "Interdependências"
 * dos cards de origem com a situação dos pedidos (é isso que alimenta o selo no quadro sem custo).
 */

// Quadros liberados (chave = shortLink do quadro). Mantenha igual ao interdep/config.js.
const AREAS = {
  "7uckGfR4": { nome: "Comercial (teste)" },
  "b4kXgCbn": { nome: "Processos (teste)" },
  "wlj9Xouh": { nome: "Auditoria (teste)" },
};
const LISTA_ENTRADA = [/nova demanda/i, /backlog/i];   // onde o pedido nasce no quadro de destino
const LISTA_FILA = /nova demanda|backlog/i;            // ainda não começou
const LISTA_CONCLUIDO = /conclu/i;                      // entregue
const CHECKLIST = "Interdependências";
const MARCA = "pmo-interdep";
const PREFIXO_REG = "link:";

// ---------------------------------------------------------------- entrada

function doPost(e) {
  let corpo;
  try { corpo = JSON.parse(e.postData.contents); } catch (_) { return json({ ok: false, erro: "Pedido inválido." }); }
  try {
    const eu = quemSou(corpo.token);
    let r;
    if (corpo.acao === "status") r = status(eu, idTrello(corpo.cardId));
    else if (corpo.acao === "pedir") r = pedir(eu, corpo);
    else if (corpo.acao === "cancelar") r = cancelar(eu, idTrello(corpo.filhoId));
    else throw publico("Ação desconhecida.");
    return json(Object.assign({ ok: true }, r));
  } catch (err) {
    if (!err.publico) console.error(err && err.stack || err);
    return json({ ok: false, erro: err.publico ? err.message : "Erro no servidor. Tente de novo em instantes.", codigo: err.codigo || null });
  }
}

function doGet() { return json({ ok: true, servico: "pmo-interdep" }); }

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function publico(msg, codigo) { const e = new Error(msg); e.publico = true; e.codigo = codigo; return e; }
function idTrello(v) { if (!/^[a-f0-9]{24}$/i.test(String(v || ""))) throw publico("Card inválido."); return String(v); }

// ---------------------------------------------------------------- Trello

function trello(metodo, caminho, params, cred) {
  const p = PropertiesService.getScriptProperties();
  const key = cred ? cred.key : p.getProperty("TRELLO_KEY");
  const token = cred ? cred.token : p.getProperty("TRELLO_TOKEN");
  const q = params || {};
  const qs = Object.keys(q).filter((k) => q[k] !== undefined && q[k] !== null)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(q[k])).join("&");
  const r = UrlFetchApp.fetch("https://api.trello.com/1" + caminho + (qs ? "?" + qs : ""), {
    method: metodo, muteHttpExceptions: true,
    headers: { Authorization: 'OAuth oauth_consumer_key="' + key + '", oauth_token="' + token + '"' },
  });
  const c = r.getResponseCode();
  if (c === 404) return null;
  if (c === 401 && cred) throw publico("É preciso autorizar o Power-Up.", 401);
  if (c >= 300) throw new Error("Trello " + metodo + " " + caminho + " -> " + c + " " + r.getContentText().slice(0, 200));
  const txt = r.getContentText();
  return txt ? JSON.parse(txt) : {};
}

function quemSou(token) {
  if (!/^[A-Za-z0-9]{32,256}$/.test(String(token || ""))) throw publico("É preciso autorizar o Power-Up.", 401);
  const key = PropertiesService.getScriptProperties().getProperty("APP_KEY");
  const eu = trello("get", "/members/me", { fields: "id,fullName" }, { key, token });
  if (!eu || !eu.id) throw publico("É preciso autorizar o Power-Up.", 401);
  return eu;
}

// Membro do QUADRO basta (não precisa ser da Área de Trabalho). Observador só lê.
function exigirMembro(eu, idQuadro, escrita) {
  const ms = trello("get", "/boards/" + idQuadro + "/memberships", {}) || [];
  const m = ms.find((x) => x.idMember === eu.id && !x.deactivated);
  if (!m) throw publico("Você não é membro deste quadro.", 403);
  if (escrita && m.memberType === "observer") throw publico("Observadores não podem fazer pedidos.", 403);
}

function lerCard(id) {
  return trello("get", "/cards/" + id, {
    fields: "name,desc,due,dueComplete,closed,idBoard,idList,shortUrl",
    attachments: "true", attachment_fields: "name,url",
    checklists: "all", board: "true", board_fields: "shortLink,name", list: "true", list_fields: "name",
  });
}

// ---------------------------------------------------------------- regras (puras)

function marcas(card) {
  return (card.attachments || []).map((a) => {
    const i = String(a.url || "").indexOf("#" + MARCA + "&");
    if (i < 0) return null;
    const p = {};
    a.url.substring(i + MARCA.length + 2).split("&").forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k) p[k] = decodeURIComponent(v || "");
    });
    p.idAnexo = a.id;
    return p;
  }).filter(Boolean);
}

function situacao(card) {
  if (!card) return "removido";
  if (card.closed) return "arquivado";
  const lista = (card.list && card.list.name) || "";
  if (card.dueComplete || LISTA_CONCLUIDO.test(lista)) return "concluido";
  if (card.due && new Date(card.due) < new Date()) return "atrasado";
  if (LISTA_FILA.test(lista)) return "na_fila";
  return "em_andamento";
}

const TEXTO_SIT = {
  removido: "card removido", arquivado: "arquivado", concluido: "✓ Concluído",
  atrasado: "⚠ Atrasado", na_fila: "Na fila", em_andamento: "Em andamento",
};

function progresso(card) {
  let itens = 0, feitos = 0;
  (card && card.checklists || []).forEach((cl) => {
    if (cl.name === CHECKLIST) return;
    (cl.checkItems || []).forEach((i) => { itens++; if (i.state === "complete") feitos++; });
  });
  return { itens, feitos, pct: itens ? Math.round((100 * feitos) / itens) : null };
}

function dataBr(iso) {
  return iso ? Utilities.formatDate(new Date(iso), "America/Sao_Paulo", "dd/MM") : "sem prazo";
}

// Texto do item no checklist do card de origem. O "⚠" é o que o selo do quadro procura.
function nomeItem(reg, filho) {
  const sit = situacao(filho);
  return "[" + nomeArea(reg.area) + "] " + reg.titulo + " — " + TEXTO_SIT[sit] +
    (filho && sit !== "concluido" ? " · prazo " + dataBr(filho.due) : "");
}

function nomeArea(k) { return (AREAS[k] && AREAS[k].nome) || k; }

// Pega a seção "ESCOPO" da descrição (padrão dos cards do PMO). Corta em 1500 caracteres.
function escopo(desc) {
  const linhas = String(desc || "").split("\n");
  const titulo = (l) => /^[\s*_#]*[A-ZÇÃÕÁÉÊÍÓÚÂ ]{4,}[\s*_:]*$/.test(l);   // linha toda em MAIÚSCULAS (ex.: **OBSERVAÇÕES**)
  const ini = linhas.findIndex((l) => /^[\s*_#]*escopo[\s*_:]*$/i.test(l));
  if (ini < 0) return "";
  const resto = linhas.slice(ini + 1);
  const fim = resto.findIndex(titulo);
  const s = (fim < 0 ? resto : resto.slice(0, fim)).join("\n").trim();
  return s.length > 1500 ? s.slice(0, 1500) + "…" : s;
}

// ---------------------------------------------------------------- registro

function registro() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(props).filter((k) => k.indexOf(PREFIXO_REG) === 0).map((k) => JSON.parse(props[k]));
}
function lerReg(idFilho) {
  const v = PropertiesService.getScriptProperties().getProperty(PREFIXO_REG + idFilho);
  return v ? JSON.parse(v) : null;
}
function gravarReg(reg) { PropertiesService.getScriptProperties().setProperty(PREFIXO_REG + reg.filho, JSON.stringify(reg)); }
function apagarReg(idFilho) { PropertiesService.getScriptProperties().deleteProperty(PREFIXO_REG + idFilho); }

// ---------------------------------------------------------------- ações

function status(eu, cardId) {
  const card = lerCard(cardId);
  if (!card) throw publico("Card não encontrado.");
  exigirMembro(eu, card.idBoard, false);
  const ms = marcas(card);

  const pedidos = ms.filter((m) => m.papel === "pai").map((m) => {
    const reg = lerReg(m.filho);
    const filho = lerCard(m.filho);
    if (reg) sincronizarItem(reg, filho, card);
    const pr = progresso(filho);
    return {
      filhoId: m.filho, area: nomeArea(m.area), titulo: reg ? reg.titulo : (filho ? filho.name : "?"),
      situacao: situacao(filho), lista: filho && filho.list ? filho.list.name : null,
      prazo: filho ? filho.due : null, itens: pr.itens, feitos: pr.feitos, pct: pr.pct,
      solicitante: reg ? reg.solicitante : null,
    };
  });

  const origens = ms.filter((m) => m.papel === "filho").map((m) => {
    const pai = lerCard(m.pai);
    const reg = lerReg(cardId);
    if (!pai) return { removido: true, area: nomeArea(m.area) };
    const pr = progresso(pai);
    return {
      area: nomeArea(m.area), projeto: pai.name, situacao: situacao(pai), prazoProjeto: pai.due,
      escopo: escopo(pai.desc), itens: pr.itens, feitos: pr.feitos, pct: pr.pct,
      solicitante: reg ? reg.solicitante : null, criado: reg ? reg.criado : null,
    };
  });

  return { pedidos, origens };
}

function pedir(eu, c) {
  const pai = lerCard(idTrello(c.cardId));
  if (!pai) throw publico("Card não encontrado.");
  exigirMembro(eu, pai.idBoard, true);
  const origem = pai.board.shortLink, destino = String(c.area || "");
  if (!AREAS[origem]) throw publico("Este quadro ainda não está liberado para pedidos entre áreas.");
  if (!AREAS[destino]) throw publico("Área de destino inválida.");
  if (destino === origem) throw publico("Escolha outra área (não a sua).");
  const titulo = String(c.titulo || "").trim().replace(/\s+/g, " ");
  if (titulo.length < 3 || titulo.length > 120) throw publico("O título precisa ter entre 3 e 120 caracteres.");
  const detalhe = String(c.detalhe || "").trim().slice(0, 3000);
  let due = null;
  if (c.prazo) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.prazo)) throw publico("Prazo inválido.");
    due = c.prazo + "T15:00:00.000Z";   // 12:00 em Brasília
  }

  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const repetido = registro().find((r) => r.pai === pai.id && r.area === destino && r.titulo.toLowerCase() === titulo.toLowerCase());
    if (repetido) return { jaExistia: true, area: nomeArea(destino) };

    const listas = trello("get", "/boards/" + destino + "/lists", { filter: "open", fields: "name" }) || [];
    let entrada = null;
    LISTA_ENTRADA.some((re) => (entrada = listas.find((l) => re.test(l.name))));
    entrada = entrada || listas[0];
    if (!entrada) throw publico("O quadro de destino não tem listas abertas.");

    const hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy");
    const desc = "**Pedido de outra área — PMO BigBox (Interdependência)**\n\n" +
      "- **Área solicitante:** " + nomeArea(origem) + "\n" +
      "- **Projeto de origem:** " + pai.name + "\n" +
      "- **Solicitado por:** " + eu.fullName + " em " + hoje + "\n" +
      "- **Prazo pedido:** " + (due ? Utilities.formatDate(new Date(due), "America/Sao_Paulo", "dd/MM/yyyy") : "sem prazo") + "\n\n" +
      "**O que é preciso**\n\n" + (detalhe || "(sem detalhes)") + "\n\n" +
      "_Este card é da sua área: organize e execute como qualquer outro. Mover para \"Concluídos\" avisa a área solicitante._";

    const filho = trello("post", "/cards", { idList: entrada.id, name: titulo, desc, due, pos: "top" });
    trello("post", "/cards/" + filho.id + "/attachments", {
      name: ("↩ Pedido de " + nomeArea(origem) + ": " + pai.name).slice(0, 250),
      url: pai.shortUrl + "#" + MARCA + "&papel=filho&pai=" + pai.id + "&area=" + origem,
    });

    let cl = (pai.checklists || []).find((x) => x.name === CHECKLIST);
    if (!cl) cl = trello("post", "/cards/" + pai.id + "/checklists", { name: CHECKLIST, pos: "top" });
    const reg = {
      pai: pai.id, filho: filho.id, area: destino, origem, titulo, checklist: cl.id, item: null,
      solicitante: eu.fullName, criado: new Date().toISOString(),
    };
    const item = trello("post", "/checklists/" + cl.id + "/checkItems", { name: nomeItem(reg, Object.assign({ list: { name: entrada.name } }, filho)), pos: "bottom" });
    reg.item = item.id;
    trello("post", "/cards/" + pai.id + "/attachments", {
      name: ("↪ Pedido a " + nomeArea(destino) + ": " + titulo).slice(0, 250),
      url: filho.shortUrl + "#" + MARCA + "&papel=pai&filho=" + filho.id + "&area=" + destino,
    });
    gravarReg(reg);
    return { jaExistia: false, area: nomeArea(destino) };
  } finally { trava.releaseLock(); }
}

// Só a área que pediu cancela. O card do destino é arquivado (dá para restaurar no Trello) com um comentário.
function cancelar(eu, idFilho) {
  const reg = lerReg(idFilho);
  if (!reg) throw publico("Pedido não encontrado.");
  const pai = lerCard(reg.pai);
  if (pai) exigirMembro(eu, pai.idBoard, true);
  else throw publico("O card de origem não existe mais.");

  const filho = lerCard(idFilho);
  if (filho && !filho.closed) {
    trello("post", "/cards/" + idFilho + "/actions/comments", { text: "Pedido cancelado pela área " + nomeArea(reg.origem) + " (" + eu.fullName + ")." });
    trello("put", "/cards/" + idFilho, { closed: "true" });
  }
  if (reg.item) trello("delete", "/cards/" + pai.id + "/checkItem/" + reg.item, {});
  marcas(pai).filter((m) => m.papel === "pai" && m.filho === idFilho)
    .forEach((m) => trello("delete", "/cards/" + pai.id + "/attachments/" + m.idAnexo, {}));
  apagarReg(idFilho);
  return {};
}

// ---------------------------------------------------------------- sincronização

// Atualiza o texto e o "feito" do item no card de origem. Só escreve se mudou (evita poluir o histórico).
function sincronizarItem(reg, filho, pai) {
  const nome = nomeItem(reg, filho);
  const estado = situacao(filho) === "concluido" ? "complete" : "incomplete";
  let atual = null;
  (pai && pai.checklists || []).forEach((cl) => (cl.checkItems || []).forEach((i) => { if (i.id === reg.item) atual = i; }));
  if (!atual && !pai) atual = trello("get", "/cards/" + reg.pai + "/checkItem/" + reg.item, {});
  if (!atual) {   // alguém apagou o item (ou o checklist): recria
    if (!pai) pai = lerCard(reg.pai);
    if (!pai) { apagarReg(reg.filho); return; }   // card de origem foi excluído: esquece o vínculo
    let cl = (pai.checklists || []).find((x) => x.name === CHECKLIST);
    if (!cl) cl = trello("post", "/cards/" + reg.pai + "/checklists", { name: CHECKLIST, pos: "top" });
    const novo = trello("post", "/checklists/" + cl.id + "/checkItems", { name: nome, checked: estado === "complete" ? "true" : "false" });
    reg.item = novo.id; reg.checklist = cl.id; gravarReg(reg);
    return;
  }
  if (atual.name !== nome || atual.state !== estado) {
    trello("put", "/cards/" + reg.pai + "/checkItem/" + reg.item, { name: nome, state: estado });
  }
}

function sincronizarTudo() {
  registro().forEach((reg) => {
    try {
      const filho = trello("get", "/cards/" + reg.filho, { fields: "name,due,dueComplete,closed", list: "true", list_fields: "name" });
      sincronizarItem(reg, filho, null);
    } catch (e) { console.error("sync " + reg.filho + ": " + e); }
  });
}

function instalarGatilho() {
  ScriptApp.getProjectTriggers().filter((g) => g.getHandlerFunction() === "sincronizarTudo").forEach((g) => ScriptApp.deleteTrigger(g));
  ScriptApp.newTrigger("sincronizarTudo").timeBased().everyMinutes(15).create();
}
