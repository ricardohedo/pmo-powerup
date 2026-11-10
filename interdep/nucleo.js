/* Regras puras do Power-Up de Interdependência (sem DOM e sem rede): selos, painel e HTML das telas.
 * Tudo que vem do Trello ou do servidor passa por esc() antes de virar HTML. */
(function (root) {
  "use strict";
  var MARCA = "pmo-interdep";
  var CHECKLIST = "Interdependências";

  var MAPA = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return MAPA[c]; }); }

  function shortLinkDaUrl(url) { return (/\/b\/([A-Za-z0-9]+)/.exec(url || "") || [])[1] || null; }
  function nomeArea(areas, key) {
    var a = (areas || []).filter(function (x) { return x.key === key; })[0];
    return a ? a.nome : key;
  }

  // Lê as marcas gravadas pelo servidor nos anexos: <url>#pmo-interdep&papel=pai|filho&...
  function marcas(attachments) {
    return (attachments || []).map(function (a) {
      var url = String(a.url || ""), i = url.indexOf("#" + MARCA + "&");
      if (i < 0) return null;
      var p = { nome: a.name };
      url.substring(i + MARCA.length + 2).split("&").forEach(function (kv) {
        var j = kv.indexOf("=");
        if (j > 0) p[kv.substring(0, j)] = decodeURIComponent(kv.substring(j + 1));
      });
      return p;
    }).filter(Boolean);
  }

  // Resumo do checklist "Interdependências" (mantido pelo servidor). "⚠" no texto = atrasado.
  function resumoPedidos(checklists) {
    var r = { total: 0, feitos: 0, atrasados: 0, itens: [] };
    (checklists || []).forEach(function (cl) {
      if (cl.name !== CHECKLIST) return;
      (cl.checkItems || []).forEach(function (i) {
        var feito = i.state === "complete";
        r.total++; if (feito) r.feitos++;
        if (!feito && i.name.indexOf("⚠") >= 0) r.atrasados++;
        r.itens.push({ nome: i.name, feito: feito });
      });
    });
    return r;
  }

  // Selos do card: só lê dados que o Trello já tem no quadro (zero chamada ao servidor).
  function selos(card, areas) {
    var out = [];
    var r = resumoPedidos(card.checklists);
    if (r.total) {
      var tudo = r.feitos === r.total;
      out.push({
        text: (tudo ? "✓ Outras áreas " : r.atrasados ? "⚠ Aguarda áreas " : "Aguarda áreas ") + r.feitos + "/" + r.total,
        color: tudo ? "green" : r.atrasados ? "red" : "yellow",
      });
    }
    var origens = marcas(card.attachments).filter(function (m) { return m.papel === "filho"; });
    origens.forEach(function (m) { out.push({ text: "Pedido de " + nomeArea(areas, m.area), color: "blue" }); });
    return out;
  }

  // Painel do quadro: o que esta área ESPERA de outras e o que ela DEVE para outras.
  function painel(cards, listas, areas) {
    var nomeLista = {};
    (listas || []).forEach(function (l) { nomeLista[l.id] = l.name; });
    var agora = Date.now();
    var esperando = [], devendo = [];
    (cards || []).forEach(function (c) {
      var r = resumoPedidos(c.checklists);
      if (r.total && r.feitos < r.total) {
        esperando.push({ card: c.name, url: c.url, pendentes: r.itens.filter(function (i) { return !i.feito; }).map(function (i) { return i.nome; }), atrasados: r.atrasados });
      }
      marcas(c.attachments).filter(function (m) { return m.papel === "filho"; }).forEach(function (m) {
        var lista = nomeLista[c.idList] || "";
        if (/conclu/i.test(lista) || c.dueComplete) return;
        devendo.push({
          card: c.name, url: c.url, para: nomeArea(areas, m.area), lista: lista, prazo: c.due,
          atrasado: !!(c.due && new Date(c.due).getTime() < agora),
        });
      });
    });
    var porAtraso = function (a, b) { return (b.atrasados || +b.atrasado || 0) - (a.atrasados || +a.atrasado || 0); };
    return { esperando: esperando.sort(porAtraso), devendo: devendo.sort(porAtraso) };
  }

  // ---------------------------------------------------------------- HTML

  var SIT = {
    atrasado: ["red", "Atrasado"], em_andamento: ["green", "Em andamento"], na_fila: ["yellow", "Na fila"],
    concluido: ["green", "Concluído"], arquivado: ["gray", "Arquivado"], removido: ["gray", "Card removido"],
  };
  function etiqueta(cod) { var s = SIT[cod] || ["gray", "Sem informação"]; return '<span class="t ' + s[0] + '">' + esc(s[1]) + "</span>"; }

  function dataBr(iso) {
    if (!iso) return "sem prazo";
    var d = new Date(iso);
    return isNaN(d.getTime()) ? "sem prazo" : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  function barra(pct, itens, feitos) {
    if (pct == null) return "<small>sem checklist</small>";
    var n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    return '<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + n + '"><div style="width:' + n + '%"></div></div>' +
      "<small>" + esc(feitos) + " de " + esc(itens) + " itens (" + n + "%)</small>";
  }

  function htmlPedidos(pedidos) {
    if (!pedidos || !pedidos.length) return "";
    return "<h4>Pedidos a outras áreas</h4>" + pedidos.map(function (p) {
      return '<div class="l"><b>' + esc(p.area) + "</b> · " + esc(p.titulo) + " " + etiqueta(p.situacao) +
        (p.lista ? "<br><small>Lista: " + esc(p.lista) + " · Prazo: " + esc(dataBr(p.prazo)) + "</small>" : "") +
        (p.situacao !== "removido" ? barra(p.pct, p.itens, p.feitos) : "") +
        (p.solicitante ? "<br><small>Pedido por " + esc(p.solicitante) + "</small>" : "") +
        '<br><button data-acao="cancelar" data-id="' + esc(p.filhoId) + '">Cancelar pedido</button></div>';
    }).join("") + "<small>Você vê só o andamento. Quem organiza e executa é a área de destino.</small>";
  }

  function htmlOrigens(origens) {
    if (!origens || !origens.length) return "";
    return "<h4>Este card é um pedido de outra área</h4>" + origens.map(function (o) {
      if (o.removido) return '<div class="l"><b>' + esc(o.area) + "</b><br><small>O projeto de origem foi removido.</small></div>";
      return '<div class="l"><b>' + esc(o.area) + "</b> · projeto <b>" + esc(o.projeto) + "</b> " + etiqueta(o.situacao) +
        "<br><small>Pedido por " + esc(o.solicitante || "?") + (o.criado ? " em " + esc(dataBr(o.criado)) : "") +
        " · Prazo do projeto: " + esc(dataBr(o.prazoProjeto)) + "</small>" +
        (o.escopo ? "<h5>Escopo do projeto</h5><div class=\"escopo\">" + esc(o.escopo).replace(/\n/g, "<br>") + "</div>" : "") +
        "<h5>Andamento do projeto</h5>" + barra(o.pct, o.itens, o.feitos) + "</div>";
    }).join("") + "<small>O quadro da área de origem continua privado: você vê só este resumo.</small>";
  }

  function htmlSecao(s) {
    var h = htmlOrigens(s.origens) + htmlPedidos(s.pedidos);
    return h || "<small>Este card não tem pedidos entre áreas.</small>";
  }

  function htmlPainel(p) {
    function lista(itens, fmt, vazio) { return itens.length ? itens.map(fmt).join("") : '<p class="vazio">' + vazio + "</p>"; }
    return "<h3>Esperando outras áreas (" + p.esperando.length + ")</h3>" +
      lista(p.esperando, function (e) {
        return '<div class="l' + (e.atrasados ? " erro" : "") + '"><a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(e.card) + "</a><ul>" +
          e.pendentes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
      }, "Nenhum projeto desta área está esperando outra área.") +
      "<h3>Pedidos de outras áreas para nós (" + p.devendo.length + ")</h3>" +
      lista(p.devendo, function (d) {
        return '<div class="l' + (d.atrasado ? " erro" : "") + '"><a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.card) + "</a>" +
          "<br><small>Para: <b>" + esc(d.para) + "</b> · Lista: " + esc(d.lista) + " · Prazo: " + esc(dataBr(d.prazo)) +
          (d.atrasado ? ' · <b class="vermelho">atrasado</b>' : "") + "</small></div>";
      }, "Nenhum pedido em aberto para esta área.");
  }

  var api = {
    MARCA: MARCA, CHECKLIST: CHECKLIST, esc: esc, shortLinkDaUrl: shortLinkDaUrl, nomeArea: nomeArea,
    marcas: marcas, resumoPedidos: resumoPedidos, selos: selos, painel: painel,
    dataBr: dataBr, htmlSecao: htmlSecao, htmlPainel: htmlPainel,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Interdep = api;
})(typeof window !== "undefined" ? window : this);
