var PMO = (function () {
  'use strict';

  var ACTIVE_LISTS = [
    'Backlog de Projetos',
    'Priorizados(prontos para iniciar)',
    'Em Execução',
    'Em Revisão'
  ];

  var DEFAULT_CHECKLIST = 'Execução - Apague e insira aqui o nome do seu checklist';
  var INACTIVITY_DAYS = 10;

  function daysSince(dateStr) {
    var then = new Date(dateStr);
    var now = new Date();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  function getIssues(card, listName) {
    var issues = [];
    var inExecution = listName === 'Em Execução';

    // CRÍTICOS
    if (!card.idMembers || card.idMembers.length === 0) {
      issues.push({ severity: 'critical', text: 'Sem responsável atribuído' });
    }
    if (!card.due) {
      issues.push({ severity: 'critical', text: 'Sem data de Fim Planejado' });
    }

    // ALERTAS
    if (!card.desc || card.desc.trim() === '') {
      issues.push({ severity: 'warning', text: 'Descrição vazia' });
    }

    if (card.checklists) {
      if (card.checklists.length === 0) {
        issues.push({ severity: 'warning', text: 'Sem checklist de execução' });
      } else {
        var hasDefault = card.checklists.some(function (cl) {
          return cl.name === DEFAULT_CHECKLIST;
        });
        if (hasDefault) {
          issues.push({ severity: 'warning', text: 'Checklist não renomeado' });
        }
        var hasExec = card.checklists.some(function (cl) {
          return cl.name.indexOf('Execução - ') === 0 && cl.name !== DEFAULT_CHECKLIST;
        });
        if (!hasExec) {
          issues.push({ severity: 'warning', text: 'Sem checklist "Execução - [Nome]"' });
        }
      }
    }

    if (card.dateLastActivity) {
      var days = daysSince(card.dateLastActivity);
      if (days >= INACTIVITY_DAYS) {
        issues.push({ severity: 'warning', text: 'Sem atividade há ' + days + ' dias' });
      }
    }

    if (inExecution && card.badges && card.badges.comments === 0) {
      issues.push({ severity: 'warning', text: 'Em Execução sem comentários' });
    }

    return issues;
  }

  function buildBadges(issues) {
    var criticals = issues.filter(function (i) { return i.severity === 'critical'; });
    var warnings  = issues.filter(function (i) { return i.severity === 'warning'; });

    if (issues.length === 0) {
      return [{ text: '✓ PMO', color: 'green' }];
    }

    var badges = [];
    if (criticals.length > 0) {
      badges.push({
        text: criticals.length + ' crítico' + (criticals.length !== 1 ? 's' : ''),
        color: 'red'
      });
    }
    if (warnings.length > 0) {
      badges.push({
        text: warnings.length + ' alerta' + (warnings.length !== 1 ? 's' : ''),
        color: 'orange'
      });
    }
    return badges;
  }

  return {
    ACTIVE_LISTS: ACTIVE_LISTS,
    getIssues: getIssues,
    buildBadges: buildBadges
  };
})();
