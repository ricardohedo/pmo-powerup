# pmo-powerup — guia para o Claude Code (qualquer PC)

Este arquivo existe para que o Claude Code de **qualquer computador** (casa ou serviço) fique alinhado.
**Antes de mexer em qualquer coisa: `git pull`.** Ao terminar uma sessão: commit + push e atualize a seção "Estado atual" abaixo.

## O usuário
- PMO da BigBox Supermercados. Não é desenvolvedor: explique em português simples, passo a passo, separando **verificado** de **dedução**. Tabela + recomendação no fim.
- Pergunte antes de: comprar/assinar, apagar, publicar, mexer em quadro real do Trello (fora dos quadros de TESTE), instalar programas.

## O que tem neste repositório
| Pasta/arquivo | O que é | Publicado em |
|---|---|---|
| `connector.html`, `card-section.html`, `board-report.html`, `pmo-rules.js`, `pmo.css` | Power-Up **PMO atual**, já em uso nos quadros. **Não alterar sem pedido explícito.** | https://ricardohedo.github.io/pmo-powerup/connector.html |
| `interdep/` | Power-Up **novo e separado**: "Interdependência entre áreas" (piloto, só quadros de TESTE). Leia `interdep/LEIA-ME.md`. | https://ricardohedo.github.io/pmo-powerup/interdep/index.html |
| `apps_script/Interdep.gs` | Servidor do Interdependência (Google Apps Script, conta do PMO). | Apps Script (fora do GitHub) |
| `interdep/testes.html`, `apps_script/testes.html` | Testes das regras (abrir no navegador; sem rede). | — |

- GitHub Pages publica a partir do branch **`main`**, raiz `/`. Tudo que entra no `main` vai ao ar em ~1 min.
- O repositório `pmo-powerup-saude` é **outro projeto, outro repositório**. Nada aqui afeta ele.

## Interdependência entre áreas — resumo
- Dor: uma área (ex.: Comercial) precisa de atividades de outra (ex.: T.I.). Destino precisa saber o que fazer; origem precisa ver o andamento. **Uma área não pode ver o quadro da outra**, e não queremos obrigar todos a serem membros da Área de Trabalho.
- Decisão (2026-11-10): **não** comprar "Card Dependencies by Screenful" (US$ 14,90/mês). Construímos o nosso.
- Como funciona: o servidor (token do PMO) cria o card no quadro de destino (lista NOVA DEMANDA/Backlog), liga os dois cards com anexos-link marcados `#pmo-interdep` e mantém um checklist "Interdependências" no card de origem (gatilho a cada 15 min). Selo e painel **não** chamam o servidor.
- Regra: a lista `AREAS` tem de ser **igual** em `interdep/config.js` e `apps_script/Interdep.gs`.

## Quadros de TESTE (só testar aqui)
| Quadro | shortLink |
|---|---|
| TESTE - copia de Comercial (23/10) | `7uckGfR4` |
| TESTE - copia de Processos (23/10) | `b4kXgCbn` |
| TESTE - copia de Auditoria (23/10) | `wlj9Xouh` |

Listas padrão: "➕ NOVA DEMANDA — Criar aqui", "Backlog de Projetos", "Priorizados(prontos para iniciar)", "Em Execução", "Em Revisão", "Concluídos".

## Contas (IMPORTANTE: tudo na conta BigBox, nunca na pessoal)
- Google: **ricardo@bigbox.com.br** (no Chrome de casa é a conta `/u/0/`; a `/u/1/` é a gmail pessoal — não usar).
- Trello: **Ricardo Hedo Nabout** (ricardo@bigbox.com.br). A conta "Ricardo Hedo" (gmail) é pessoal — não usar para registrar nada.

## Onde está cada peça do Interdependência
| Peça | Onde | Observação |
|---|---|---|
| Servidor | Apps Script **"PMO Interdependência (piloto)"** na conta BigBox (id `1NZkNHaIcIBlYbISurcfeeb5YpLnofZvyChtqOugEvpgsSTlJL6oySK2T`) | App da Web, Executar como: eu · Acesso: qualquer pessoa. Gatilho `sincronizarTudo` a cada 15 min instalado. |
| URL do servidor | `https://script.google.com/macros/s/AKfycbw0--rEpAVoqgIfXoBs8ZGt_AsMyt69YKF3xCnqZ2lBFFZo2yWmkw4Wqith_Jx-yPer/exec` | Já no `interdep/config.js`. |
| Power-Up | Admin do Trello, Área "PMO - PROJETOS E INOVAÇÕES", app **"PMO BigBox – Interdependência"** (id `6af3b2c762d807766f3401c7`) | 6 capacidades; origem permitida `https://ricardohedo.github.io`. |
| `APP_KEY` | `9233eafb60c6769f1ad5cdf2da2123b5` (pública) | Igual no `config.js` e na propriedade `APP_KEY` do script. |
| `TRELLO_KEY` / `TRELLO_TOKEN` | Propriedades do script (copiadas do projeto "PMO Interdependência v2 (teste)") | Chave = a do app "Interdependência v2 (teste)". **Não excluir esse app no Trello**, senão o token para de funcionar. Token **vence em 10/12/2026** → gerar outro antes. |

- Se alterar `Interdep.gs`: colar no Apps Script e fazer **Implantar → Gerenciar implantações → editar → Nova versão** (mantém a mesma URL).

## Estado atual (atualize ao final de cada sessão)
**2026-11-10 (PC de casa):**
- Servidor publicado e respondendo (`doGet` → `{"ok":true}`; POST sem token → 401, como esperado).
- Power-Up registrado pela conta BigBox; `config.js` preenchido e no `main`.
- Removido: projeto Apps Script criado por engano na conta pessoal (lixeira do Drive) e o Power-Up criado por engano pela conta Trello pessoal (excluído).
- Próximos passos:
  1. Ativar o Power-Up nos 3 quadros de TESTE e testar Comercial → Processos.
  2. Remover do TESTE Comercial as 2 dependências de estudo da Screenful (Padronização Etiquetas ↔ Otimização de Pricing; teste interd2 → teste interd10). Autorizado pelo usuário.
  3. Montar teste automático (Playwright) com login salvo.
