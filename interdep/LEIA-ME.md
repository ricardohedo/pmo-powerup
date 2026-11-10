# PMO BigBox – Interdependência entre áreas (piloto)

Uma área (ex.: Comercial) pede atividades a outra (ex.: T.I.) a partir do card do projeto.

| Quem | O que vê |
|---|---|
| **Área que pede** | Selo no card no quadro (`Aguarda áreas 1/3`, vermelho se algo atrasou), checklist **Interdependências** que se marca sozinho quando a outra área conclui, e no verso do card o andamento ao vivo (lista, prazo, % do checklist). |
| **Área que executa** | Um card de verdade na lista **NOVA DEMANDA** do quadro dela, com selo azul `Pedido de Comercial`, descrição com solicitante/prazo e, no verso, o escopo e o andamento do projeto de origem. |
| **Ambas** | Botão **Interdependências** no quadro: "o que esperamos de outras áreas" e "o que outras áreas esperam de nós". |

Ninguém precisa ser membro da Área de Trabalho nem ver o quadro da outra área: quem lê e escreve nos quadros é o servidor (conta do PMO). O usuário só autoriza uma vez (acesso de leitura, para provar quem é); o servidor confere se ele é membro do quadro do card.

## Como funciona

- **Vínculo:** dois anexos-link com marca na URL (`#pmo-interdep&papel=pai&filho=…` no card de origem e `#pmo-interdep&papel=filho&pai=…` no card de destino) + um registro no servidor.
- **Situação:** `Concluído` (lista "Concluídos" ou data marcada como concluída) · `Atrasado` (prazo vencido) · `Na fila` (NOVA DEMANDA/Backlog) · `Em andamento`.
- **Selo e painel não chamam o servidor:** leem o checklist `Interdependências` e os anexos, que o Trello já carregou. O servidor atualiza o checklist a cada 15 min e sempre que alguém abre o card.
- **Cancelar:** só a área que pediu. O card do destino é arquivado (dá para restaurar) com um comentário.

## Instalação (piloto)

1. **Servidor:** crie um projeto no Google Apps Script com `apps_script/Interdep.gs`.
   - Propriedades do script: `TRELLO_KEY` e `TRELLO_TOKEN` (conta do PMO, membro dos quadros liberados) e `APP_KEY` (chave do Power-Up).
   - Implantar → App da Web → Executar como: **eu** · Acesso: **qualquer pessoa**. Copie a URL `/exec`.
   - Rode `instalarGatilho()` uma vez.
2. **Power-Up:** em <https://trello.com/power-ups/admin> crie um Power-Up novo com conector `…/interdep/index.html`, capacidades *card-badges, card-back-section, card-buttons, board-buttons, authorization-status, show-authorization*. Gere a chave de API dele.
3. Preencha `API_URL` e `APP_KEY` em `interdep/config.js` e publique.
4. Ative o Power-Up só nos quadros de teste. Para liberar outro quadro, acrescente o shortLink em `AREAS` **nos dois lugares** (config.js e Interdep.gs).

## Testes

Abra `interdep/testes.html` no navegador (regras puras do `nucleo.js`, sem rede).
